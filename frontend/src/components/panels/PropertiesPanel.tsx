import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { getWidgetDef } from '../../types/widgets';
import { Trash2, AlignLeft, AlignCenter, AlignRight, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, ArrowLeftRight, ArrowUpDown } from 'lucide-react';
import type { IRNode } from '../../types/ir';

export function PropertiesPanel() {
  const selectedIds = useProjectStore((s) => s.selectedIds);
  const document = useProjectStore((s) => s.document);
  const updateWidget = useProjectStore((s) => s.updateWidget);
  const updateWidgetProps = useProjectStore((s) => s.updateWidgetProps);
  const updateWidgetStyle = useProjectStore((s) => s.updateWidgetStyle);
  const updateWidgetGeometry = useProjectStore((s) => s.updateWidgetGeometry);
  const removeWidget = useProjectStore((s) => s.removeWidget);
  const removeSelectedWidgets = useProjectStore((s) => s.removeSelectedWidgets);

  function findNode(root: typeof document.root, id: string): typeof document.root | null {
    if (root.id === id) return root;
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    return null;
  }

  const selectedNodes = selectedIds.map((id) => findNode(document.root, id)).filter(Boolean) as IRNode[];

  if (selectedIds.length === 0) {
    return (
      <div className="p-4 text-center text-lab-overlay0 text-xs">
        Select a widget on the canvas to edit its properties.
      </div>
    );
  }

  if (selectedIds.length > 1) {
    return (
      <div className="p-3 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-lab-text">{selectedIds.length} widgets selected</div>
            <div className="text-[10px] text-lab-overlay0">
              {selectedNodes.map((n) => n.name).join(', ')}
            </div>
          </div>
          <button
            onClick={() => removeSelectedWidgets()}
            className="p-1.5 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
            title="Delete selected"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <MultiAlignTools nodes={selectedNodes} />
      </div>
    );
  }

  const node = selectedNodes[0];
  if (!node) return null;

  const def = getWidgetDef(node.type);
  const style = node.style || {};

  return (
    <div className="p-3 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-lab-text">{def?.label || node.type}</div>
          <div className="text-[10px] text-lab-overlay0 font-mono">{node.name}</div>
        </div>
        <button
          onClick={() => removeWidget(node.id)}
          className="p-1.5 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
          title="Delete widget"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Name */}
      <PropertyGroup title="Identity">
        <TextField label="Name" value={node.name} onChange={(v) => updateWidget(node.id, { name: v })} />
      </PropertyGroup>

      {/* Geometry */}
      <PropertyGroup title="Geometry">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="X" value={node.geometry.x} onChange={(v) => updateWidgetGeometry(node.id, { x: v })} />
          <NumberField label="Y" value={node.geometry.y} onChange={(v) => updateWidgetGeometry(node.id, { y: v })} />
          <NumberField label="W" value={node.geometry.w} onChange={(v) => updateWidgetGeometry(node.id, { w: v })} />
          <NumberField label="H" value={node.geometry.h} onChange={(v) => updateWidgetGeometry(node.id, { h: v })} />
        </div>
      </PropertyGroup>

      {/* Abstract Props */}
      <PropertyGroup title="Properties">
        {'label' in (def?.defaultProps || {}) && (
          <TextField
            label="Label"
            value={node.abstract_props.label || ''}
            onChange={(v) => updateWidgetProps(node.id, { label: v })}
          />
        )}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={node.abstract_props.enabled ?? true}
            onChange={(e) => updateWidgetProps(node.id, { enabled: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-lab-surface2 accent-lab-blue"
          />
          <span className="text-xs text-lab-subtext0">Enabled</span>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={node.abstract_props.visible ?? true}
            onChange={(e) => updateWidgetProps(node.id, { visible: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-lab-surface2 accent-lab-blue"
          />
          <span className="text-xs text-lab-subtext0">Visible</span>
        </div>
      </PropertyGroup>

      {/* Variable Binding */}
      {['Entry', 'Scale', 'Checkbutton', 'Radiobutton', 'Combobox', 'Spinbox'].includes(node.type) && (
        <PropertyGroup title="Variable Binding">
          <VariableBindingEditor node={node} />
        </PropertyGroup>
      )}

      {/* Events */}
      <PropertyGroup title="Events">
        <EventsEditor node={node} />
      </PropertyGroup>

      {/* Widget-specific config */}
      {node.type === 'Progressbar' && (
        <PropertyGroup title="Progressbar">
          <SelectField
            label="Orient"
            value={(node.widget_props?.orient as string) || 'horizontal'}
            options={['horizontal', 'vertical']}
            onChange={(v) => updateWidget(node.id, { widget_props: { ...node.widget_props, orient: v } })}
          />
          <SelectField
            label="Mode"
            value={(node.widget_props?.mode as string) || 'determinate'}
            options={['determinate', 'indeterminate']}
            onChange={(v) => updateWidget(node.id, { widget_props: { ...node.widget_props, mode: v } })}
          />
          <NumberField
            label="Maximum"
            value={(node.widget_props?.maximum as number) || 100}
            onChange={(v) => updateWidget(node.id, { widget_props: { ...node.widget_props, maximum: v } })}
          />
        </PropertyGroup>
      )}
      {node.type === 'Treeview' && (
        <PropertyGroup title="Treeview">
          <TextField
            label="Columns"
            value={((node.widget_props?.columns as string[]) || ['Column 1', 'Column 2']).join(', ')}
            onChange={(v) => updateWidget(node.id, { widget_props: { ...node.widget_props, columns: v.split(',').map((s) => s.trim()).filter(Boolean) } })}
          />
        </PropertyGroup>
      )}
      {['Separator', 'Scrollbar'].includes(node.type) && (
        <PropertyGroup title="Orientation">
          <SelectField
            label="Orient"
            value={(node.widget_props?.orient as string) || 'horizontal'}
            options={['horizontal', 'vertical']}
            onChange={(v) => updateWidget(node.id, { widget_props: { ...node.widget_props, orient: v } })}
          />
        </PropertyGroup>
      )}
      {node.type === 'OptionMenu' && (
        <PropertyGroup title="OptionMenu">
          <TextField
            label="Values"
            value={((node.widget_props?.values as string[]) || ['Option 1', 'Option 2']).join(', ')}
            onChange={(v) => updateWidget(node.id, { widget_props: { ...node.widget_props, values: v.split(',').map((s) => s.trim()).filter(Boolean) } })}
          />
          <VariableBindingEditor node={node} />
        </PropertyGroup>
      )}

      {/* Custom Widget Editor */}
      {node.type === 'Custom' && (
        <PropertyGroup title="Custom HTML/CSS/JS">
          <CustomWidgetEditor node={node} />
        </PropertyGroup>
      )}

      {/* Style */}
      <PropertyGroup title="Style">
        <ColorField label="Background" value={style.bg || ''} onChange={(v) => updateWidgetStyle(node.id, { bg: v || undefined })} />
        <ColorField label="Foreground" value={style.fg || ''} onChange={(v) => updateWidgetStyle(node.id, { fg: v || undefined })} />
        <TextField label="Font Family" value={style.font_family || ''} onChange={(v) => updateWidgetStyle(node.id, { font_family: v || undefined })} />
        <NumberField label="Font Size" value={style.font_size || 0} onChange={(v) => updateWidgetStyle(node.id, { font_size: v || undefined })} />
        <select
          value={style.font_weight || 'normal'}
          onChange={(e) => updateWidgetStyle(node.id, { font_weight: e.target.value as any })}
          className="w-full bg-lab-surface0 text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue"
        >
          <option value="normal">Normal</option>
          <option value="bold">Bold</option>
        </select>
        <NumberField label="Border Width" value={style.border_width || 0} onChange={(v) => updateWidgetStyle(node.id, { border_width: v })} />
        <ColorField label="Border Color" value={style.border_color || ''} onChange={(v) => updateWidgetStyle(node.id, { border_color: v || undefined })} />
        <NumberField label="Border Radius" value={style.border_radius || 0} onChange={(v) => updateWidgetStyle(node.id, { border_radius: v })} />
      </PropertyGroup>
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-lab-subtext0 w-16 shrink-0">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-lab-surface0 text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function EventsEditor({ node }: { node: IRNode }) {
  const updateWidget = useProjectStore((s) => s.updateWidget);

  const hasClick = node.events.some((e) => e.name === 'on_click');

  const toggleClick = () => {
    if (hasClick) {
      updateWidget(node.id, { events: node.events.filter((e) => e.name !== 'on_click') });
    } else {
      updateWidget(node.id, { events: [...node.events, { name: 'on_click', inline_code: '' }] });
    }
  };

  const updateClickCode = (code: string) => {
    updateWidget(node.id, {
      events: node.events.map((e) => (e.name === 'on_click' ? { ...e, inline_code: code } : e)),
    });
  };

  const clickEvent = node.events.find((e) => e.name === 'on_click');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-lab-subtext0">on_click</span>
        <button
          onClick={toggleClick}
          className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
            hasClick ? 'bg-lab-blue/20 text-lab-blue' : 'bg-lab-surface0 text-lab-overlay0 hover:text-lab-text'
          }`}
        >
          {hasClick ? 'Enabled' : 'Add'}
        </button>
      </div>

      {hasClick && clickEvent && (
        <div className="space-y-1">
          <label className="text-[10px] text-lab-overlay0">Handler Code (Python)</label>
          <textarea
            value={clickEvent.inline_code || ''}
            onChange={(e) => updateClickCode(e.target.value)}
            placeholder="# Write Python code here&#10;self.instrument.query('*IDN?')"
            className="w-full h-24 bg-lab-base text-lab-text text-[11px] font-mono rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue resize-none"
            spellCheck={false}
          />
        </div>
      )}
    </div>
  );
}

function VariableBindingEditor({ node }: { node: IRNode }) {
  const stateVars = useProjectStore((s) => s.document.state_variables);
  const updateWidget = useProjectStore((s) => s.updateWidget);

  const boundVar = node.widget_props?.variable as string | undefined;
  const boundTextVar = node.widget_props?.textvariable as string | undefined;

  const currentBinding = boundVar || boundTextVar || '';

  const handleChange = (name: string) => {
    if (!name) {
      const newProps = { ...node.widget_props };
      delete newProps.variable;
      delete newProps.textvariable;
      updateWidget(node.id, { widget_props: newProps });
      return;
    }
    const sv = stateVars.find((s) => s.name === name);
    if (!sv) return;

    const isBool = sv.type === 'bool';
    const newProps = { ...node.widget_props };
    if (isBool) {
      delete newProps.textvariable;
      newProps.variable = name;
    } else {
      delete newProps.variable;
      newProps.textvariable = name;
    }
    updateWidget(node.id, { widget_props: newProps });
  };

  const compatibleVars = stateVars.filter((sv) => {
    if (node.type === 'Checkbutton' || node.type === 'Radiobutton') {
      return sv.type === 'bool' || sv.type === 'string' || sv.type === 'int';
    }
    return true;
  });

  return (
    <div className="space-y-1.5">
      <select
        value={currentBinding}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full bg-lab-surface0 text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue"
      >
        <option value="">— None —</option>
        {compatibleVars.map((sv) => (
          <option key={sv.id} value={sv.name}>
            {sv.name} ({sv.type})
          </option>
        ))}
      </select>
      {currentBinding && (
        <div className="text-[10px] text-lab-overlay0">
          Bound to: <span className="text-lab-blue font-mono">{currentBinding}</span>
        </div>
      )}
    </div>
  );
}

function PropertyGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-bold text-lab-overlay0 uppercase tracking-wider">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-lab-subtext0 w-16 shrink-0">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 min-w-0 bg-lab-surface0 text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue"
      />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-lab-subtext0 w-8 shrink-0">{label}</span>
      <input
        type="number"
        value={value || 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 min-w-0 bg-lab-surface0 text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-lab-subtext0 w-16 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border border-lab-surface1 bg-transparent cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-lab-surface0 text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
        />
      </div>
    </div>
  );
}

function MultiAlignTools({ nodes }: { nodes: IRNode[] }) {
  const updateWidgetsGeometry = useProjectStore((s) => s.updateWidgetsGeometry);

  if (nodes.length < 2) return null;

  const apply = (fn: (nodes: IRNode[]) => Record<string, Partial<IRNode['geometry']>>) => {
    const updates = fn(nodes);
    updateWidgetsGeometry(updates);
  };

  const alignLeft = () => {
    const minX = Math.min(...nodes.map((n) => n.geometry.x));
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (const n of nodes) updates[n.id] = { x: minX };
    return updates;
  };

  const alignCenterH = () => {
    const centers = nodes.map((n) => n.geometry.x + n.geometry.w / 2);
    const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (const n of nodes) updates[n.id] = { x: avg - n.geometry.w / 2 };
    return updates;
  };

  const alignRight = () => {
    const maxRight = Math.max(...nodes.map((n) => n.geometry.x + n.geometry.w));
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (const n of nodes) updates[n.id] = { x: maxRight - n.geometry.w };
    return updates;
  };

  const alignTop = () => {
    const minY = Math.min(...nodes.map((n) => n.geometry.y));
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (const n of nodes) updates[n.id] = { y: minY };
    return updates;
  };

  const alignCenterV = () => {
    const centers = nodes.map((n) => n.geometry.y + n.geometry.h / 2);
    const avg = centers.reduce((a, b) => a + b, 0) / centers.length;
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (const n of nodes) updates[n.id] = { y: avg - n.geometry.h / 2 };
    return updates;
  };

  const alignBottom = () => {
    const maxBottom = Math.max(...nodes.map((n) => n.geometry.y + n.geometry.h));
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (const n of nodes) updates[n.id] = { y: maxBottom - n.geometry.h };
    return updates;
  };

  const distributeH = () => {
    if (nodes.length < 3) return {} as Record<string, Partial<IRNode['geometry']>>;
    const sorted = [...nodes].sort((a, b) => a.geometry.x - b.geometry.x);
    const minX = sorted[0].geometry.x;
    const maxX = sorted[sorted.length - 1].geometry.x;
    const span = maxX - minX;
    const step = span / (sorted.length - 1);
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (let i = 0; i < sorted.length; i++) {
      updates[sorted[i].id] = { x: minX + step * i };
    }
    return updates;
  };

  const distributeV = () => {
    if (nodes.length < 3) return {} as Record<string, Partial<IRNode['geometry']>>;
    const sorted = [...nodes].sort((a, b) => a.geometry.y - b.geometry.y);
    const minY = sorted[0].geometry.y;
    const maxY = sorted[sorted.length - 1].geometry.y;
    const span = maxY - minY;
    const step = span / (sorted.length - 1);
    const updates: Record<string, Partial<IRNode['geometry']>> = {};
    for (let i = 0; i < sorted.length; i++) {
      updates[sorted[i].id] = { y: minY + step * i };
    }
    return updates;
  };

  const btn = (icon: React.ReactNode, title: string, fn: () => Record<string, Partial<IRNode['geometry']>>) => (
    <button
      key={title}
      onClick={() => apply(fn)}
      className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors"
      title={title}
    >
      {icon}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="text-[10px] font-bold text-lab-overlay0 uppercase tracking-wider">Align</div>
      <div className="flex items-center gap-1 flex-wrap">
        {btn(<AlignLeft className="w-3.5 h-3.5" />, 'Align Left', alignLeft)}
        {btn(<AlignCenter className="w-3.5 h-3.5" />, 'Align Center H', alignCenterH)}
        {btn(<AlignRight className="w-3.5 h-3.5" />, 'Align Right', alignRight)}
        {btn(<AlignVerticalJustifyStart className="w-3.5 h-3.5" />, 'Align Top', alignTop)}
        {btn(<AlignVerticalJustifyCenter className="w-3.5 h-3.5" />, 'Align Middle', alignCenterV)}
        {btn(<AlignVerticalJustifyEnd className="w-3.5 h-3.5" />, 'Align Bottom', alignBottom)}
      </div>
      <div className="text-[10px] font-bold text-lab-overlay0 uppercase tracking-wider">Distribute</div>
      <div className="flex items-center gap-1 flex-wrap">
        {btn(<ArrowLeftRight className="w-3.5 h-3.5" />, 'Distribute Horizontally', distributeH)}
        {btn(<ArrowUpDown className="w-3.5 h-3.5" />, 'Distribute Vertically', distributeV)}
      </div>
    </div>
  );
}

function CustomWidgetEditor({ node }: { node: IRNode }) {
  const updateWidget = useProjectStore((s) => s.updateWidget);
  const props = (node.widget_props ?? {}) as { html?: string; css?: string; js?: string };

  const update = (key: 'html' | 'css' | 'js', value: string) => {
    updateWidget(node.id, {
      widget_props: { ...props, [key]: value },
    });
  };

  const [activeTab, setActiveTab] = useState<'html' | 'css' | 'js'>('html');

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(['html', 'css', 'js'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase transition-colors ${
              activeTab === t
                ? 'bg-lab-blue/20 text-lab-blue'
                : 'bg-lab-surface0 text-lab-overlay0 hover:text-lab-text'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <textarea
        value={props[activeTab] ?? ''}
        onChange={(e) => update(activeTab, e.target.value)}
        placeholder={`<!-- Enter ${activeTab.toUpperCase()} here -->`}
        className="w-full h-32 bg-lab-base text-lab-text text-[11px] font-mono rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue resize-none"
        spellCheck={false}
      />
    </div>
  );
}
