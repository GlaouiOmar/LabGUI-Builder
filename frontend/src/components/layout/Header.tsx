import { useEffect, useCallback } from 'react';
import {
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3x3,
  Play,
  Download,
  Settings,
  PanelLeft,
  PanelRight,
  PanelBottom,
  Save,
  FolderOpen,
  Wrench,
} from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { generateTkinterCode } from '../../generator/tkinterGenerator';
import { useState, useRef } from 'react';
import { SettingsModal } from './SettingsModal';

export function Header() {
  const projectDoc = useProjectStore((s) => s.document);
  const isSaved = useProjectStore((s) => s.isSaved);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const exportToJSON = useProjectStore((s) => s.exportToJSON);
  const loadFromJSON = useProjectStore((s) => s.loadFromJSON);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const copyWidget = useProjectStore((s) => s.copyWidget);
  const pasteWidget = useProjectStore((s) => s.pasteWidget);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const canUndo = useProjectStore((s) => s.canUndo);
  const canRedo = useProjectStore((s) => s.canRedo);
  const nudgeSelected = useProjectStore((s) => s.nudgeSelected);

  const zoom = useUIStore((s) => s.zoom);
  const zoomIn = useUIStore((s) => s.zoomIn);
  const zoomOut = useUIStore((s) => s.zoomOut);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const gridSize = useUIStore((s) => s.gridSize);
  const showGrid = useUIStore((s) => s.showGrid);
  const setSnapToGrid = useUIStore((s) => s.setSnapToGrid);
  const setShowGrid = useUIStore((s) => s.setShowGrid);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const toggleBottomPanel = useUIStore((s) => s.toggleBottomPanel);
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const bottomOpen = useUIStore((s) => s.bottomPanelOpen);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(projectDoc.project_name);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedIds.length === 1) {
          e.preventDefault();
          copyWidget(selectedIds[0]);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        pasteWidget(projectDoc.root.id);
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? (snapToGrid ? gridSize : 10) : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        nudgeSelected(dx, dy);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedIds, copyWidget, pasteWidget, projectDoc.root.id, undo, redo, nudgeSelected, snapToGrid, gridSize]);

  const handleSave = useCallback(() => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectDoc.project_name.replace(/\s+/g, '_')}.gui.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectDoc.project_name, exportToJSON]);

  const handleLoad = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) loadFromJSON(text);
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [loadFromJSON]
  );

  const handleExportPy = useCallback(() => {
    const code = generateTkinterCode(projectDoc);
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectDoc.project_name.replace(/\s+/g, '_')}.py`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectDoc]);

  const handleRunPreview = useCallback(() => {
    const code = generateTkinterCode(projectDoc);
    const blob = new Blob([code], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preview_${Date.now()}.py`;
    a.click();
    URL.revokeObjectURL(url);
  }, [projectDoc]);

  return (
    <header className="h-12 flex items-center justify-between px-3 border-b border-lab-surface0 bg-lab-crust shrink-0 z-50">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.gui.json"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Left group */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-lab-text">
          <Wrench className="w-5 h-5 text-lab-blue" />
          <span className="font-semibold text-sm">LabGUI</span>
        </div>
        <div className="w-px h-5 bg-lab-surface0" />
        {editingName ? (
          <input
            autoFocus
            className="bg-lab-surface0 text-lab-text text-sm px-2 py-0.5 rounded border border-lab-blue outline-none w-48"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onBlur={() => {
              setProjectName(nameInput || 'Untitled Project');
              setEditingName(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setProjectName(nameInput || 'Untitled Project');
                setEditingName(false);
              }
            }}
          />
        ) : (
          <button
            onClick={() => {
              setNameInput(projectDoc.project_name);
              setEditingName(true);
            }}
            className="text-sm text-lab-subtext0 hover:text-lab-text transition-colors"
            title="Click to rename"
          >
            {!isSaved && <span className="text-lab-yellow mr-1">*</span>}
            {projectDoc.project_name}
          </button>
        )}
        <button
          onClick={handleSave}
          className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors"
          title="Save .gui.json (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
        </button>
        <button
          onClick={handleLoad}
          className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors"
          title="Open .gui.json"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
      </div>

      {/* Center group */}
      <div className="flex items-center gap-1">
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors disabled:opacity-30"
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors disabled:opacity-30"
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-lab-surface0 mx-1" />
        <span className="text-xs text-lab-subtext0 w-10 text-center">{zoom}%</span>
        <button onClick={zoomOut} className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={zoomIn} className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors">
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="w-px h-5 bg-lab-surface0 mx-1" />
        <button
          onClick={() => setSnapToGrid(!snapToGrid)}
          className={`p-1.5 rounded transition-colors ${snapToGrid ? 'text-lab-blue bg-lab-surface0' : 'text-lab-subtext0 hover:bg-lab-surface0 hover:text-lab-text'}`}
          title="Snap to Grid"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-1.5 rounded transition-colors ${showGrid ? 'text-lab-blue bg-lab-surface0' : 'text-lab-subtext0 hover:bg-lab-surface0 hover:text-lab-text'}`}
          title="Show Grid"
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
      </div>

      {/* Right group */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleRunPreview}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-lab-blue text-lab-crust text-xs font-semibold hover:bg-lab-blueLight transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          Run Preview
        </button>
        <button
          onClick={handleExportPy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-lab-surface2 text-lab-text text-xs font-medium hover:bg-lab-surface0 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          Export .py
        </button>
        <div className="w-px h-5 bg-lab-surface0 mx-1" />
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors"
          title="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={toggleLeftPanel}
          className={`p-1.5 rounded transition-colors ${leftOpen ? 'text-lab-blue bg-lab-surface0' : 'text-lab-subtext0 hover:bg-lab-surface0 hover:text-lab-text'}`}
          title="Toggle Left Panel"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
        <button
          onClick={toggleRightPanel}
          className={`p-1.5 rounded transition-colors ${rightOpen ? 'text-lab-blue bg-lab-surface0' : 'text-lab-subtext0 hover:bg-lab-surface0 hover:text-lab-text'}`}
          title="Toggle Right Panel"
        >
          <PanelRight className="w-4 h-4" />
        </button>
        <button
          onClick={toggleBottomPanel}
          className={`p-1.5 rounded transition-colors ${bottomOpen ? 'text-lab-blue bg-lab-surface0' : 'text-lab-subtext0 hover:bg-lab-surface0 hover:text-lab-text'}`}
          title="Toggle Bottom Panel"
        >
          <PanelBottom className="w-4 h-4" />
        </button>
      </div>
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </header>
  );
}
