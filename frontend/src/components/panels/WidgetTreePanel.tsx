import { useProjectStore } from '../../stores/projectStore';
import { ChevronDown, ChevronRight, Square, MousePointerClick, Type, TextCursor, AlignLeft, Paintbrush, List, SlidersHorizontal, CheckSquare, CircleDot, ChevronsUpDown, ArrowUpDown, LayoutGrid, PanelTop, BookOpen, Columns, Code, Activity, Table, Minus, ScrollText, ListStart } from 'lucide-react';
import { useState } from 'react';
import type { IRNode } from '../../types/ir';

const iconMap: Record<string, React.ElementType> = {
  Button: MousePointerClick,
  Label: Type,
  Entry: TextCursor,
  Text: AlignLeft,
  Frame: Square,
  Canvas: Paintbrush,
  Listbox: List,
  Scale: SlidersHorizontal,
  Checkbutton: CheckSquare,
  Radiobutton: CircleDot,
  Combobox: ChevronsUpDown,
  Spinbox: ArrowUpDown,
  GridContainer: LayoutGrid,
  LabelFrame: PanelTop,
  Notebook: BookOpen,
  PanedWindow: Columns,
  Progressbar: Activity,
  Treeview: Table,
  Separator: Minus,
  Scrollbar: ScrollText,
  OptionMenu: ListStart,
  Custom: Code,
};

export function WidgetTreePanel() {
  const root = useProjectStore((s) => s.document.root);
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const setSelectedId = useProjectStore((s) => s.setSelectedId);
  const toggleSelection = useProjectStore((s) => s.toggleSelection);

  return (
    <div className="p-2">
      <TreeNode node={root} selectedIds={selectedIds} onSelect={setSelectedId} onToggle={toggleSelection} depth={0} />
    </div>
  );
}

function TreeNode({
  node,
  selectedIds,
  onSelect,
  onToggle,
  depth,
}: {
  node: IRNode;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selectedIds.includes(node.id);
  const Icon = iconMap[node.type] || Square;

  return (
    <div>
      <button
        onClick={(e) => {
          if (e.ctrlKey || e.metaKey) {
            onToggle(node.id);
          } else {
            onSelect(node.id);
          }
        }}
        className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-xs transition-colors ${
          isSelected ? 'bg-lab-blue/20 text-lab-blue' : 'text-lab-subtext0 hover:bg-lab-surface0 hover:text-lab-text'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <span onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }} className="shrink-0">
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </span>
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{node.name}</span>
        <span className="ml-auto text-[10px] text-lab-overlay0 shrink-0">{node.type}</span>
      </button>

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} selectedIds={selectedIds} onSelect={onSelect} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
