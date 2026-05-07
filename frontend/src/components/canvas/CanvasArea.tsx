import { useRef, useCallback, useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { CanvasWidget } from './CanvasWidget';
import type { GuideLine } from '../../types/canvas';
import type { IRNode } from '../../types/ir';
import { GALLERY_WIDGETS } from '../../lib/widgetGallery';

export function CanvasArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const root = useProjectStore((s) => s.document.root);
  const addWidget = useProjectStore((s) => s.addWidget);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const clearSelection = useProjectStore((s) => s.clearSelection);

  const zoom = useUIStore((s) => s.zoom) / 100;
  const showGrid = useUIStore((s) => s.showGrid);
  const gridSize = useUIStore((s) => s.gridSize);
  const snapToGrid = useUIStore((s) => s.snapToGrid);
  const draggingWidgetType = useUIStore((s) => s.draggingWidgetType);
  const draggingGalleryId = useUIStore((s) => s.draggingGalleryId);

  const [dragOver, setDragOver] = useState(false);
  const [guides, setGuides] = useState<GuideLine[]>([]);

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
          // We need to update the newly added widget with gallery content
          // addWidget creates the widget but we need to find it and update props
          // This is async, so we'll use a timeout or we need to change addWidget to accept overrides
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

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
        clearSelection();
      }
    },
    [clearSelection]
  );

  // Collect all widgets into a flat list
  const flatWidgets: IRNode[] = [];
  function collect(node: IRNode) {
    if (node.id !== root.id) {
      flatWidgets.push(node);
    }
    for (const child of node.children) {
      collect(child);
    }
  }
  collect(root);

  const canvasW = Math.max(2000, root.geometry.w * zoom + 400);
  const canvasH = Math.max(2000, root.geometry.h * zoom + 400);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-auto ${dragOver ? 'bg-lab-blue/5' : 'bg-lab-base'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleCanvasClick}
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
