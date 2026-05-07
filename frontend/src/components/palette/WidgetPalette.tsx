import { useState } from 'react';
import {
  Puzzle,
  ChevronDown,
  ChevronRight,
  MousePointerClick,
  Type,
  TextCursor,
  AlignLeft,
  Square,
  Paintbrush,
  List,
  SlidersHorizontal,
  CheckSquare,
  CircleDot,
  ChevronsUpDown,
  ArrowUpDown,
  LayoutGrid,
  PanelTop,
  BookOpen,
  Columns,
  LayoutTemplate,
  FileCode,
} from 'lucide-react';
import { WIDGET_DEFINITIONS, WIDGET_CATEGORIES } from '../../types/widgets';
import type { WidgetType } from '../../types/ir';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { LAB_TEMPLATES } from '../../lib/templates';

const iconMap: Record<string, React.ElementType> = {
  MousePointerClick,
  Type,
  TextCursor,
  AlignLeft,
  Square,
  Paintbrush,
  List,
  SlidersHorizontal,
  CheckSquare,
  CircleDot,
  ChevronsUpDown,
  ArrowUpDown,
  LayoutGrid,
  PanelTop,
  BookOpen,
  Columns,
};

export function WidgetPalette() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    Container: true,
    Input: true,
    Display: true,
    Lab: true,
  });

  const leftPanelTab = useUIStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useUIStore((s) => s.setLeftPanelTab);
  const setDraggingWidgetType = useUIStore((s) => s.setDraggingWidgetType);
  const setDocument = useProjectStore((s) => s.setDocument);

  const handleDragStart = (type: WidgetType) => {
    setDraggingWidgetType(type);
  };

  const handleDragEnd = () => {
    setDraggingWidgetType(null);
  };

  const handleLoadTemplate = (templateId: string) => {
    const template = LAB_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      if (confirm(`Load template "${template.name}"? Unsaved changes will be lost.`)) {
        setDocument(template.document);
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-lab-surface0">
        <button
          onClick={() => setLeftPanelTab('widgets')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            leftPanelTab === 'widgets'
              ? 'text-lab-blue border-b-2 border-lab-blue bg-lab-surface0/30'
              : 'text-lab-subtext0 hover:text-lab-text'
          }`}
        >
          <Puzzle className="w-3.5 h-3.5" />
          Widgets
        </button>
        <button
          onClick={() => setLeftPanelTab('templates')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
            leftPanelTab === 'templates'
              ? 'text-lab-blue border-b-2 border-lab-blue bg-lab-surface0/30'
              : 'text-lab-subtext0 hover:text-lab-text'
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Templates
        </button>
      </div>

      {leftPanelTab === 'widgets' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {WIDGET_CATEGORIES.map((cat) => {
            const widgets = WIDGET_DEFINITIONS.filter((w) => w.category === cat.key);
            if (widgets.length === 0) return null;
            const isOpen = expanded[cat.key] ?? true;

            return (
              <div key={cat.key}>
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [cat.key]: !prev[cat.key] }))}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-lab-subtext1 uppercase tracking-wide hover:text-lab-text transition-colors"
                >
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {cat.label}
                </button>

                {isOpen && (
                  <div className="space-y-0.5 ml-1">
                    {widgets.map((w) => {
                      const Icon = iconMap[w.icon] || Square;
                      return (
                        <div
                          key={w.type}
                          draggable
                          onDragStart={() => handleDragStart(w.type)}
                          onDragEnd={handleDragEnd}
                          className="flex items-center gap-2.5 px-2.5 py-2 rounded cursor-grab active:cursor-grabbing hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors group"
                          title={w.description}
                        >
                          <Icon className="w-4 h-4 text-lab-overlay0 group-hover:text-lab-blue transition-colors" />
                          <span className="text-xs font-medium">{w.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {leftPanelTab === 'templates' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {LAB_TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => handleLoadTemplate(template.id)}
              className="w-full text-left p-3 rounded bg-lab-surface0/40 hover:bg-lab-surface0 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <FileCode className="w-4 h-4 text-lab-blue group-hover:text-lab-blueLight transition-colors" />
                <span className="text-xs font-semibold text-lab-text">{template.name}</span>
              </div>
              <div className="text-[10px] text-lab-overlay0 mb-1.5">{template.description}</div>
              <span className="inline-block px-1.5 py-0.5 rounded bg-lab-crust text-[10px] text-lab-subtext0">
                {template.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
