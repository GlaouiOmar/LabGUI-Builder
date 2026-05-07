import { useRef, useState, useCallback, useEffect } from 'react';
import type { IRNode } from '../../types/ir';
import { useProjectStore } from '../../stores/projectStore';
import type { GuideLine } from '../../types/canvas';
import { computeSnap } from '../../lib/guides';

interface CanvasWidgetProps {
  node: IRNode;
  isSelected: boolean;
  isMultiSelected: boolean;
  containerOffset: { x: number; y: number };
  zoom: number;
  gridSize: number;
  snapToGrid: boolean;
  allNodes: IRNode[];
  canvasBounds: { w: number; h: number };
  onGuidesChange: (guides: GuideLine[]) => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w';

export function CanvasWidget({
  node,
  isSelected,
  isMultiSelected,
  containerOffset,
  zoom,
  gridSize,
  snapToGrid,
  allNodes,
  canvasBounds,
  onGuidesChange,
}: CanvasWidgetProps) {
  const updateWidgetGeometry = useProjectStore((s) => s.updateWidgetGeometry);
  const setSelectedId = useProjectStore((s) => s.setSelectedId);
  const toggleSelection = useProjectStore((s) => s.toggleSelection);
  const removeWidget = useProjectStore((s) => s.removeWidget);

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);

  const dragStart = useRef({ x: 0, y: 0, geom: { ...node.geometry } });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
        toggleSelection(node.id);
      } else {
        if (!isSelected) {
          setSelectedId(node.id);
        }
      }
      if ((e.target as HTMLElement).dataset.handle) return;

      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        geom: { ...node.geometry },
      };
    },
    [node.id, node.geometry, isSelected, setSelectedId, toggleSelection]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, handle: ResizeHandle) => {
      e.stopPropagation();
      setIsResizing(true);
      setResizeHandle(handle);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        geom: { ...node.geometry },
      };
    },
    [node.geometry]
  );

  useEffect(() => {
    if (!isDragging && !isResizing) {
      onGuidesChange([]);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;

      if (isDragging) {
        let nx = dragStart.current.geom.x + dx;
        let ny = dragStart.current.geom.y + dy;

        // Smart guides snap
        const trialNode: IRNode = {
          ...node,
          geometry: { ...node.geometry, x: nx, y: ny },
        };
        const snap = computeSnap(
          trialNode,
          allNodes.filter((n) => n.id !== node.id),
          canvasBounds
        );

        if (snap.x !== undefined) nx = snap.x;
        if (snap.y !== undefined) ny = snap.y;
        onGuidesChange(snap.guides);

        if (snapToGrid && snap.x === undefined) {
          nx = Math.round(nx / gridSize) * gridSize;
        }
        if (snapToGrid && snap.y === undefined) {
          ny = Math.round(ny / gridSize) * gridSize;
        }

        updateWidgetGeometry(node.id, { x: nx, y: ny });
      } else if (isResizing && resizeHandle) {
        let { x, y, w, h } = dragStart.current.geom;

        if (resizeHandle.includes('e')) w = Math.max(16, dragStart.current.geom.w + dx);
        if (resizeHandle.includes('s')) h = Math.max(16, dragStart.current.geom.h + dy);
        if (resizeHandle.includes('w')) {
          const nw = Math.max(16, dragStart.current.geom.w - dx);
          x = dragStart.current.geom.x + dragStart.current.geom.w - nw;
          w = nw;
        }
        if (resizeHandle.includes('n')) {
          const nh = Math.max(16, dragStart.current.geom.h - dy);
          y = dragStart.current.geom.y + dragStart.current.geom.h - nh;
          h = nh;
        }

        if (snapToGrid) {
          x = Math.round(x / gridSize) * gridSize;
          y = Math.round(y / gridSize) * gridSize;
          w = Math.max(gridSize, Math.round(w / gridSize) * gridSize);
          h = Math.max(gridSize, Math.round(h / gridSize) * gridSize);
        }

        updateWidgetGeometry(node.id, { x, y, w, h });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      onGuidesChange([]);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSelected && e.key === 'Delete') {
        removeWidget(node.id);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isDragging,
    isResizing,
    resizeHandle,
    node.id,
    node.geometry,
    isSelected,
    zoom,
    gridSize,
    snapToGrid,
    updateWidgetGeometry,
    removeWidget,
    allNodes,
    canvasBounds,
    onGuidesChange,
  ]);

  const style = node.style || {};
  const label = node.abstract_props.label || '';

  let displayText = label;
  if (node.type === 'Entry') displayText = label || '';
  if (node.type === 'Frame') displayText = '';
  if (node.type === 'GridContainer') displayText = '';
  if (node.type === 'Canvas') displayText = '';

  return (
    <div
      className={`absolute select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: containerOffset.x + node.geometry.x,
        top: containerOffset.y + node.geometry.y,
        width: node.geometry.w,
        height: node.geometry.h,
        zIndex: isSelected ? 10 : 1,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Widget body */}
      <div
        className={`w-full h-full rounded overflow-hidden ${
          isSelected
            ? isMultiSelected
              ? 'ring-2 ring-lab-peach ring-offset-1 ring-offset-lab-base'
              : 'ring-2 ring-lab-blue ring-offset-1 ring-offset-lab-base'
            : ''
        }`}
        style={{
          backgroundColor: style.bg || 'transparent',
          color: style.fg || '#cdd6f4',
          borderWidth: style.border_width || 0,
          borderColor: style.border_color || '#45475a',
          borderStyle: 'solid',
          borderRadius: style.border_radius || 4,
          fontFamily: style.font_family || 'Inter',
          fontSize: style.font_size ? `${style.font_size}px` : '12px',
          fontWeight: style.font_weight || 'normal',
          display: 'flex',
          alignItems: 'center',
          justifyContent: node.type === 'Button' ? 'center' : 'flex-start',
          padding: style.padding ? `${style.padding[0]}px ${style.padding[1]}px` : '4px 8px',
          boxShadow: node.type === 'Button' ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
        }}
      >
        {node.type === 'Entry' && (
          <div className="w-full h-full flex items-center px-2 bg-lab-base/60 rounded border border-lab-surface0 truncate">
            {label || <span className="text-lab-overlay0 italic text-xs">Entry...</span>}
          </div>
        )}
        {node.type === 'Text' && (
          <div className="w-full h-full p-2 bg-lab-base/40 rounded overflow-hidden text-xs leading-relaxed whitespace-pre-wrap">
            {label || <span className="text-lab-overlay0 italic">Text area...</span>}
          </div>
        )}
        {node.type === 'Listbox' && (
          <div className="w-full h-full bg-lab-base/40 rounded overflow-hidden text-xs">
            <div className="px-2 py-1 text-lab-subtext0">Item 1</div>
            <div className="px-2 py-1 text-lab-subtext0">Item 2</div>
            <div className="px-2 py-1 text-lab-subtext0">Item 3</div>
          </div>
        )}
        {node.type === 'Scale' && (
          <div className="w-full h-full flex items-center px-2">
            <div className="flex-1 h-1.5 bg-lab-surface0 rounded-full relative">
              <div className="absolute left-1/2 -top-1 w-3 h-3 bg-lab-blue rounded-full shadow" />
            </div>
          </div>
        )}
        {node.type === 'Checkbutton' && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-lab-surface2 rounded bg-lab-base flex items-center justify-center">
              <div className="w-2 h-2 bg-lab-blue rounded-sm" />
            </div>
            <span className="truncate">{label}</span>
          </div>
        )}
        {node.type === 'Radiobutton' && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border border-lab-surface2 rounded-full bg-lab-base flex items-center justify-center">
              <div className="w-2 h-2 bg-lab-blue rounded-full" />
            </div>
            <span className="truncate">{label}</span>
          </div>
        )}
        {node.type === 'Combobox' && (
          <div className="w-full h-full flex items-center px-2 bg-lab-base/60 rounded border border-lab-surface0 justify-between">
            <span className="truncate text-lab-overlay0">Select...</span>
            <svg width="10" height="6" viewBox="0 0 10 6" className="text-lab-overlay0"><path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>
          </div>
        )}
        {node.type === 'Spinbox' && (
          <div className="w-full h-full flex items-center px-2 bg-lab-base/60 rounded border border-lab-surface0 justify-between">
            <span>0</span>
            <div className="flex flex-col gap-0.5">
              <svg width="8" height="4" viewBox="0 0 8 4" className="text-lab-overlay0"><path d="M0 4l4-4 4 4z" fill="currentColor"/></svg>
              <svg width="8" height="4" viewBox="0 0 8 4" className="text-lab-overlay0"><path d="M0 0l4 4 4-4z" fill="currentColor"/></svg>
            </div>
          </div>
        )}
        {node.type === 'Frame' && (
          <div className="w-full h-full border border-lab-surface0 rounded bg-lab-base/20" />
        )}
        {node.type === 'GridContainer' && (
          <div className="w-full h-full border border-dashed border-lab-surface2 rounded bg-lab-base/10 relative">
            <div className="absolute inset-0 flex items-center justify-center text-lab-overlay0 text-xs">
              Grid Container
            </div>
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(#313244 1px, transparent 1px), linear-gradient(90deg, #313244 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              opacity: 0.3,
            }} />
          </div>
        )}
        {node.type === 'LabelFrame' && (
          <div className="w-full h-full border border-lab-surface0 rounded bg-lab-base/20 relative">
            <div className="absolute -top-2 left-2 px-1 bg-lab-mantle text-xs text-lab-subtext0">{label}</div>
          </div>
        )}
        {node.type === 'Notebook' && (
          <div className="w-full h-full flex flex-col">
            <div className="flex gap-0.5">
              <div className="px-3 py-1 bg-lab-surface1 text-xs rounded-t">Tab 1</div>
              <div className="px-3 py-1 bg-lab-surface0 text-xs rounded-t text-lab-overlay0">Tab 2</div>
            </div>
            <div className="flex-1 border border-lab-surface0 rounded-b bg-lab-base/20" />
          </div>
        )}
        {node.type === 'PanedWindow' && (
          <div className="w-full h-full flex">
            <div className="flex-1 border border-lab-surface0 rounded bg-lab-base/20" />
            <div className="w-1.5 bg-lab-surface0 cursor-col-resize" />
            <div className="flex-1 border border-lab-surface0 rounded bg-lab-base/20" />
          </div>
        )}
        {node.type === 'Canvas' && (
          <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center justify-center text-lab-overlay0 text-xs">
            Canvas
          </div>
        )}
        {node.type === 'Progressbar' && (
          <div className="w-full h-full flex items-center px-1">
            <div className="w-full h-2 bg-lab-surface0 rounded-full overflow-hidden">
              <div className="h-full bg-lab-blue rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
        )}
        {node.type === 'Treeview' && (
          <div className="w-full h-full bg-lab-base/40 rounded overflow-hidden text-xs border border-lab-surface0">
            <div className="flex border-b border-lab-surface0 bg-lab-surface0/50">
              <div className="px-2 py-1 flex-1 font-medium text-lab-subtext0">Column 1</div>
              <div className="px-2 py-1 flex-1 font-medium text-lab-subtext0">Column 2</div>
            </div>
            <div className="flex border-b border-lab-surface0/50">
              <div className="px-2 py-1 flex-1 text-lab-subtext0">Item 1</div>
              <div className="px-2 py-1 flex-1 text-lab-subtext0">Value 1</div>
            </div>
            <div className="flex border-b border-lab-surface0/50">
              <div className="px-2 py-1 flex-1 text-lab-subtext0">Item 2</div>
              <div className="px-2 py-1 flex-1 text-lab-subtext0">Value 2</div>
            </div>
          </div>
        )}
        {node.type === 'Separator' && (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-full h-px bg-lab-surface2" style={{ transform: node.geometry.w < node.geometry.h ? 'rotate(90deg)' : 'none' }} />
          </div>
        )}
        {node.type === 'Scrollbar' && (
          <div className="w-full h-full flex items-center justify-center p-0.5">
            {node.geometry.w > node.geometry.h ? (
              <div className="w-full h-3 bg-lab-surface0 rounded-full relative">
                <div className="absolute left-2 top-0 h-full w-8 bg-lab-surface2 rounded-full" />
              </div>
            ) : (
              <div className="h-full w-3 bg-lab-surface0 rounded-full relative">
                <div className="absolute top-2 left-0 w-full h-8 bg-lab-surface2 rounded-full" />
              </div>
            )}
          </div>
        )}
        {node.type === 'OptionMenu' && (
          <div className="w-full h-full flex items-center px-2 bg-lab-base/60 rounded border border-lab-surface0 justify-between">
            <span className="truncate text-lab-text">{node.abstract_props.label || 'Select'}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" className="text-lab-overlay0"><path d="M0 0l5 6 5-6z" fill="currentColor"/></svg>
          </div>
        )}
        {node.type === 'Custom' && <CustomWidgetPreview node={node} />}
        {(node.type === 'Button' || node.type === 'Label') && (
          <span className="truncate">{displayText}</span>
        )}
      </div>

      {/* Resize handles */}
      {isSelected && (
        <>
          {(['nw', 'ne', 'sw', 'se'] as ResizeHandle[]).map((h) => (
            <div
              key={h}
              data-handle={h}
              className="absolute w-2.5 h-2.5 bg-lab-blue border border-lab-crust rounded-sm z-20"
              style={{
                cursor: `${h}-resize`,
                ...(h.includes('n') ? { top: -3 } : { bottom: -3 }),
                ...(h.includes('w') ? { left: -3 } : { right: -3 }),
        zIndex: 25,
              }}
              onMouseDown={(e) => handleResizeMouseDown(e, h)}
            />
          ))}
        </>
      )}
    </div>
  );
}

function CustomWidgetPreview({ node }: { node: IRNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const props = node.widget_props as { html?: string; css?: string; js?: string } | undefined;

  const html = props?.html ?? '<!-- Custom widget -->';
  const css = props?.css ?? '';
  const js = props?.js ?? '';

  const srcDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
${css}
</style>
</head>
<body>
${html}
<script>
try {
  ${js}
} catch (e) {
  console.error(e);
}
<\/script>
</body>
</html>`;

  return (
    <iframe
      ref={iframeRef}
      title={node.name}
      sandbox="allow-scripts"
      className="w-full h-full rounded"
      style={{ border: 'none', background: 'transparent' }}
      srcDoc={srcDoc}
    />
  );
}
