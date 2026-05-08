import { useState } from 'react';
import {
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
  Activity,
  Table,
  Minus,
  ScrollText,
  ListStart,
  Code,
} from 'lucide-react';
import { WIDGET_DEFINITIONS } from '../../types/widgets';
import type { WidgetType } from '../../types/ir';
import { useUIStore } from '../../stores/uiStore';
import { useProjectStore } from '../../stores/projectStore';
import { LAB_TEMPLATES } from '../../lib/templates';
import { GALLERY_WIDGETS } from '../../lib/widgetGallery';

const iconMap: Record<string, React.ElementType> = {
  MousePointerClick, Type, TextCursor, AlignLeft, Square, Paintbrush,
  List, SlidersHorizontal, CheckSquare, CircleDot, ChevronsUpDown,
  ArrowUpDown, LayoutGrid, PanelTop, BookOpen, Columns, Code,
  Activity, Table, Minus, ScrollText, ListStart,
  Gauge: Activity, Binary: Type, TrendingUp: Activity, BarChart3: Table, ToggleLeft: CheckSquare,
};

interface PaletteItem {
  id: string;
  name: string;
  description: string;
  type: 'widget' | 'gallery';
  widgetType?: WidgetType;
  galleryId?: string;
  icon: string;
  preview: React.ReactNode;
}

function buildPaletteItems(): { category: string; label: string; items: PaletteItem[] }[] {
  const categories: { category: string; label: string; items: PaletteItem[] }[] = [
    { category: 'container', label: 'Containers', items: [] },
    { category: 'input', label: 'Input', items: [] },
    { category: 'display', label: 'Display', items: [] },
    { category: 'gauge', label: 'Gauges', items: [] },
    { category: 'chart', label: 'Charts', items: [] },
    { category: 'control', label: 'Controls', items: [] },
  ];

  const findCat = (key: string) => categories.find((c) => c.category === key)!;

  // Standard widgets
  for (const def of WIDGET_DEFINITIONS) {
    const item: PaletteItem = {
      id: def.type,
      name: def.label,
      description: def.description,
      type: 'widget',
      widgetType: def.type,
      icon: def.icon,
      preview: <MiniWidgetPreview type={def.type} />,
    };
    if (def.category === 'Container') findCat('container').items.push(item);
    else if (def.category === 'Input') findCat('input').items.push(item);
    else if (def.category === 'Display') findCat('display').items.push(item);
  }

  // Gallery widgets
  for (const g of GALLERY_WIDGETS) {
    const item: PaletteItem = {
      id: g.id,
      name: g.name,
      description: g.description,
      type: 'gallery',
      galleryId: g.id,
      icon: g.icon,
      preview: <MiniGalleryPreview gallery={g} />,
    };
    if (g.category === 'Gauge') findCat('gauge').items.push(item);
    else if (g.category === 'Chart') findCat('chart').items.push(item);
    else if (g.category === 'Control') findCat('control').items.push(item);
    else if (g.category === 'Display') findCat('display').items.push(item);
  }

  return categories.filter((c) => c.items.length > 0);
}

function MiniWidgetPreview({ type }: { type: WidgetType }) {
  const previews: Record<string, React.ReactNode> = {
    Button: <div className="w-full h-full bg-lab-surface0 rounded flex items-center justify-center text-[8px] text-lab-overlay0">Btn</div>,
    Label: <div className="w-full h-full flex items-center justify-center text-[8px] text-lab-overlay0">Label</div>,
    Entry: <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center px-1"><span className="text-[7px] text-lab-overlay0">...</span></div>,
    Text: <div className="w-full h-full bg-lab-base/40 rounded border border-lab-surface0 p-0.5"><div className="w-full h-px bg-lab-surface1 mb-0.5" /><div className="w-2/3 h-px bg-lab-surface1" /></div>,
    Frame: <div className="w-full h-full border border-lab-surface1 rounded bg-lab-base/20" />,
    Canvas: <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center justify-center text-[8px] text-lab-overlay0">Canvas</div>,
    Listbox: <div className="w-full h-full bg-lab-base/40 rounded border border-lab-surface0 overflow-hidden"><div className="h-1.5 bg-lab-surface0/50" /><div className="h-1.5 bg-lab-base/30" /></div>,
    Scale: <div className="w-full h-full flex items-center px-0.5"><div className="w-full h-0.5 bg-lab-surface0 rounded-full relative"><div className="absolute left-1/2 -top-0.5 w-1 h-1 bg-lab-blue rounded-full" /></div></div>,
    Checkbutton: <div className="w-full h-full flex items-center gap-0.5 px-0.5"><div className="w-2 h-2 border border-lab-surface2 rounded bg-lab-base flex items-center justify-center"><div className="w-1 h-1 bg-lab-blue rounded-sm" /></div><span className="text-[7px] text-lab-overlay0">Check</span></div>,
    Radiobutton: <div className="w-full h-full flex items-center gap-0.5 px-0.5"><div className="w-2 h-2 border border-lab-surface2 rounded-full bg-lab-base flex items-center justify-center"><div className="w-1 h-1 bg-lab-blue rounded-full" /></div><span className="text-[7px] text-lab-overlay0">Radio</span></div>,
    Combobox: <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center justify-between px-1"><span className="text-[7px] text-lab-overlay0">Select</span><span className="text-[6px]">▼</span></div>,
    Spinbox: <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center justify-between px-1"><span className="text-[7px]">0</span><div className="flex flex-col gap-px"><span className="text-[5px] leading-none">▲</span><span className="text-[5px] leading-none">▼</span></div></div>,
    GridContainer: <div className="w-full h-full border border-dashed border-lab-surface2 rounded bg-lab-base/10 flex items-center justify-center text-[7px] text-lab-overlay0">Grid</div>,
    LabelFrame: <div className="w-full h-full border border-lab-surface0 rounded bg-lab-base/20 relative"><div className="absolute -top-1 left-1 px-0.5 bg-lab-mantle text-[6px] text-lab-subtext0">Group</div></div>,
    Notebook: <div className="w-full h-full flex flex-col"><div className="flex gap-px"><div className="px-1.5 py-px bg-lab-surface1 text-[6px] rounded-t">Tab</div><div className="px-1.5 py-px bg-lab-surface0 text-[6px] rounded-t text-lab-overlay0">Tab</div></div><div className="flex-1 border border-lab-surface0 rounded-b bg-lab-base/20" /></div>,
    PanedWindow: <div className="w-full h-full flex gap-px"><div className="flex-1 border border-lab-surface0 rounded bg-lab-base/20" /><div className="w-px bg-lab-surface0" /><div className="flex-1 border border-lab-surface0 rounded bg-lab-base/20" /></div>,
    Progressbar: <div className="w-full h-full flex flex-col items-center justify-center gap-px px-1"><span className="text-[6px] text-lab-overlay0">Progress</span><div className="w-full h-1 bg-lab-surface0 rounded-full overflow-hidden"><div className="h-full bg-lab-blue rounded-full" style={{ width: '60%' }} /></div></div>,
    Treeview: <div className="w-full h-full bg-lab-base/40 rounded border border-lab-surface0 overflow-hidden"><div className="flex border-b border-lab-surface0 bg-lab-surface0/50"><div className="px-1 py-px flex-1 text-[6px] text-lab-subtext0">Col</div><div className="px-1 py-px flex-1 text-[6px] text-lab-subtext0">Col</div></div></div>,
    Separator: <div className="w-full h-full flex items-center justify-center"><div className="w-full h-px bg-lab-surface2" /></div>,
    Scrollbar: <div className="w-full h-full flex items-center justify-center p-px"><div className="h-full w-1.5 bg-lab-surface0 rounded-full relative"><div className="absolute top-1 left-0 w-full h-2 bg-lab-surface2 rounded-full" /></div></div>,
    OptionMenu: <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center justify-between px-1"><span className="text-[7px] text-lab-text">Select</span><span className="text-[6px]">▼</span></div>,
    Custom: <div className="w-full h-full bg-lab-base/60 rounded border border-lab-surface0 flex items-center justify-center text-[7px] text-lab-overlay0">HTML</div>,
  };
  return <>{previews[type] || <div className="w-full h-full bg-lab-base/20 rounded" />}</>;
}

function MiniGalleryPreview({ gallery }: { gallery: (typeof GALLERY_WIDGETS)[0] }) {
  return (
    <div className="w-full h-full rounded overflow-hidden bg-lab-base/40 border border-lab-surface0/50 flex items-center justify-center">
      <span className="text-[8px] text-lab-overlay0 font-medium">{gallery.name}</span>
    </div>
  );
}

export function WidgetPalette() {
  const categories = useState(buildPaletteItems)[0];
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of categories) init[c.category] = true;
    return init;
  });

  const leftPanelTab = useUIStore((s) => s.leftPanelTab);
  const setLeftPanelTab = useUIStore((s) => s.setLeftPanelTab);
  const setDraggingWidgetType = useUIStore((s) => s.setDraggingWidgetType);
  const setDraggingGalleryId = useUIStore((s) => s.setDraggingGalleryId);
  const setDocument = useProjectStore((s) => s.setDocument);

  const handleDragStartWidget = (type: WidgetType) => setDraggingWidgetType(type);
  const handleDragStartGallery = (id: string) => setDraggingGalleryId(id);
  const handleDragEnd = () => {
    setDraggingWidgetType(null);
    setDraggingGalleryId(null);
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
          <LayoutTemplate className="w-3.5 h-3.5" />
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
          <FileCode className="w-3.5 h-3.5" />
          Templates
        </button>
      </div>

      {leftPanelTab === 'widgets' && (
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {categories.map((cat) => {
            const isOpen = expanded[cat.category] ?? true;
            return (
              <div key={cat.category}>
                <button
                  onClick={() => setExpanded((prev) => ({ ...prev, [cat.category]: !prev[cat.category] }))}
                  className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-lab-subtext1 uppercase tracking-wide hover:text-lab-text transition-colors"
                >
                  {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  {cat.label}
                </button>

                {isOpen && (
                  <div className="grid grid-cols-2 gap-1.5 ml-1">
                    {cat.items.map((item) => {
                      const Icon = iconMap[item.icon] || Square;
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() => {
                            if (item.type === 'widget' && item.widgetType) handleDragStartWidget(item.widgetType);
                            else if (item.type === 'gallery' && item.galleryId) handleDragStartGallery(item.galleryId);
                          }}
                          onDragEnd={handleDragEnd}
                          className="flex flex-col gap-1 p-2 rounded cursor-grab active:cursor-grabbing hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors group border border-transparent hover:border-lab-surface1"
                          title={item.description}
                        >
                          <div className="w-full aspect-[4/3] rounded overflow-hidden bg-lab-crust border border-lab-surface0/50">
                            {item.preview}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Icon className="w-3 h-3 text-lab-overlay0 group-hover:text-lab-blue transition-colors shrink-0" />
                            <span className="text-[10px] font-medium truncate">{item.name}</span>
                          </div>
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
