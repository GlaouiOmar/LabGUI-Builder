import { useRef, useCallback, useState, useEffect } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { CanvasWidget } from './CanvasWidget';
import type { GuideLine } from '../../types/canvas';
import type { IRNode } from '../../types/ir';
import { GALLERY_WIDGETS } from '../../lib/widgetGallery';

interface SelectionBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

function collectWidgets(node: IRNode, rootId: string, out: IRNode[]) {
  if (node.id !== rootId) {
    out.push(node);
  }
  for (const child of node.children) {
    collectWidgets(child, rootId, out);
  }
}

export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const root = useProjectStore((s) => s.document.root);
  const addWidget = useProjectStore((s) => s.addWidget);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const toggleSelection = useProjectStore((s) => s.toggleSelection);
  const selectAll = useProjectStore((s) => s.selectAll);
  const clearSelection = useProjectStore((s) => s.clearSelection);
  const removeSelectedWidgets = useProjectStore((s) => s.removeSelectedWidgets);
  const nudgeSelected = useProjectStore((s) => s.nudgeSelected);

  const zoom = useUIStore((s) => s.zoom) / 100;
  const showGrid = useUIStore((s) => s.showGrid);
  const gridSize = useUIStore((s) => s.gridSize);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const draggingWidgetType = useUIStore((s) => s.draggingWidgetType);
  const draggingGalleryId = useUIStore((s) => s.draggingGalleryId);

  const [dragOver, setDragOver] = useState(false);
  const [guides, setGuides] = useState<GuideLine[]>([]);

  // Rubber-band selection state
  const [selecting, setSelecting] = useState(false);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const selectStart = useRef({ x: 0, y: 0 });

  // Collect all widgets into a flat list — MUST be before callbacks that reference it
  const flatWidgets: IRNode[] = [];
  collectWidgets(root, root.id, flatWidgets);

  const canvasW = Math.max(2000, root.geometry.w * zoom + 400);
  const canvasH = Math.max(2000, root.geometry.h * zoom + 400);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let x = (e.clientX - rect.left) / zoom;
      let y = (e.clientY - rect.top) / zoom;

      if (snapToGrid) {
        x = Math.round(x / gridSize) * gridSize;
        y = Math.round(y / gridSize) * gridSize;
      }

      if (draggingGalleryId) {
        const gallery = GALLERY_WIDGETS.find((g) => g.id === draggingGalleryId);
        if (gallery) {
          addWidget('Custom', root.id, { x, y });
          setTimeout(() => {
            const newId = useProjectStore.getState().selectedIds[0];
            if (newId) {
              useProjectStore.getState().updateWidget(newId, {
                name: gallery.id.replace(/-/g, '_'),
                geometry: { x, y, ...gallery.defaultGeometry },
                widget_props: {
                  html: gallery.html,
                  css: gallery.css,
                  js: gallery.js,
                  ...gallery.defaultProps,
                },
              });
            }
          }, 0);
        }
        return;
      }

      if (draggingWidgetType) {
        addWidget(draggingWidgetType as any, root.id, { x, y });
      }
    },
    [draggingWidgetType, draggingGalleryId, zoom, snapToGrid, gridSize, addWidget, root.id]
  );

  // Mouse selection handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start selection on background click (not on widgets)
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-widget]')) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      selectStart.current = { x, y };
      setSelecting(true);
      setSelectionBox({ x, y, w: 0, h: 0 });

      if (!e.ctrlKey && !e.metaKey) {
        clearSelection();
      }
    },
    [zoom, clearSelection]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!selecting || !containerRef.current) return;
      e.preventDefault();

      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / zoom;
      const y = (e.clientY - rect.top) / zoom;

      const x1 = Math.min(selectStart.current.x, x);
      const y1 = Math.min(selectStart.current.y, y);
      const x2 = Math.max(selectStart.current.x, x);
      const y2 = Math.max(selectStart.current.y, y);

      setSelectionBox({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
    },
    [selecting, zoom]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (!selecting || !selectionBox) {
        setSelecting(false);
        return;
      }

      // Find widgets intersecting the selection box
      const OFFSET = { x: 20, y: 20 };
      const box = {
        left: selectionBox.x - OFFSET.x,
        top: selectionBox.y - OFFSET.y,
        right: selectionBox.x + selectionBox.w - OFFSET.x,
        bottom: selectionBox.y + selectionBox.h - OFFSET.y,
      };

      for (const node of flatWidgets) {
        const widgetLeft = node.geometry.x;
        const widgetTop = node.geometry.y;
        const widgetRight = node.geometry.x + node.geometry.w;
        const widgetBottom = node.geometry.y + node.geometry.h;

        const intersects =
          widgetLeft < box.right &&
          widgetRight > box.left &&
          widgetTop < box.bottom &&
          widgetBottom > box.top;

        if (intersects) {
          if (e.ctrlKey || e.metaKey) {
            toggleSelection(node.id);
          } else if (!selectedIds.includes(node.id)) {
            toggleSelection(node.id);
          }
        }
      }

      setSelecting(false);
      setSelectionBox(null);
    },
    [selecting, selectionBox, flatWidgets, selectedIds, toggleSelection]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        removeSelectedWidgets();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        selectAll();
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
  }, [selectedIds, removeSelectedWidgets, selectAll, nudgeSelected, snapToGrid, gridSize]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-auto ${dragOver ? 'bg-lab-blue/5' : 'bg-lab-base'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Grid background */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle, #313244 1px, transparent 1px)`,
            backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
            width: canvasW,
            height: canvasH,
          }}
        />
      )}

      {/* Guide lines overlay */}
      {guides.map((g, i) => (
        <div
          key={i}
          className="absolute pointer-events-none z-30"
          style={
            g.orientation === 'vertical'
              ? {
                  left: 20 + g.position,
                  top: 0,
                  width: 1,
                  height: canvasH,
                  backgroundColor: '#f38ba8',
                  boxShadow: '0 0 4px #f38ba8',
                }
              : {
                  left: 0,
                  top: 20 + g.position,
                  width: canvasW,
                  height: 1,
                  backgroundColor: '#f38ba8',
                  boxShadow: '0 0 4px #f38ba8',
                }
          }
        />
      ))}

      {/* Selection box overlay */}
      {selecting && selectionBox && (
        <div
          className="absolute pointer-events-none z-20 border border-lab-blue bg-lab-blue/10"
          style={{
            left: selectionBox.x,
            top: selectionBox.y,
            width: selectionBox.w,
            height: selectionBox.h,
          }}
        />
      )}

      {/* Canvas content */}
      <div
        className="relative"
        style={{
          width: canvasW,
          height: canvasH,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
      >
        {/* Root frame visual */}
        <div
          className="absolute border border-lab-surface0 bg-lab-base/50"
          style={{
            left: 20,
            top: 20,
            width: root.geometry.w,
            height: root.geometry.h,
          }}
        />

        {flatWidgets.map((node) => (
          <CanvasWidget
            key={node.id}
            node={node}
            isSelected={selectedIds.includes(node.id)}
            isMultiSelected={selectedIds.length > 1}
            containerOffset={{ x: 20, y: 20 }}
            zoom={zoom}
            gridSize={gridSize}
            snapToGrid={snapToGrid}
            allNodes={flatWidgets}
            canvasBounds={{ w: root.geometry.w, h: root.geometry.h }}
            onGuidesChange={setGuides}
          />
        ))}
      </div>
    </div>
  );
}
