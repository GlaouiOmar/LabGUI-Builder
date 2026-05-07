/**
 * Widget Definitions — metadata, default properties, and category organization
 */
import type { WidgetType, IRAbstractProps, IRStyle, IRGeometry, IRNode } from './ir';

export interface WidgetDef {
  type: WidgetType;
  label: string;
  description: string;
  category: 'Input' | 'Display' | 'Container' | 'Lab';
  icon: string; // lucide icon name
  defaultGeometry: IRGeometry;
  defaultProps: IRAbstractProps;
  defaultStyle: IRStyle;
  hasChildren: boolean;
  allowedChildren?: WidgetType[];
}

export const WIDGET_DEFINITIONS: WidgetDef[] = [
  // Input widgets
  {
    type: 'Button',
    label: 'Button',
    description: 'Clickable button that triggers an action',
    category: 'Input',
    icon: 'MousePointerClick',
    defaultGeometry: { x: 0, y: 0, w: 100, h: 32 },
    defaultProps: { label: 'Button', enabled: true, visible: true },
    defaultStyle: { bg: '#45475a', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', padding: [4, 12], border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Entry',
    label: 'Entry',
    description: 'Single-line text input field',
    category: 'Input',
    icon: 'TextCursor',
    defaultGeometry: { x: 0, y: 0, w: 140, h: 28 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', padding: [4, 8], border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Checkbutton',
    label: 'Checkbutton',
    description: 'Binary on/off checkbox',
    category: 'Input',
    icon: 'CheckSquare',
    defaultGeometry: { x: 0, y: 0, w: 120, h: 24 },
    defaultProps: { label: 'Check', enabled: true, visible: true },
    defaultStyle: { fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'Radiobutton',
    label: 'Radiobutton',
    description: 'Mutually exclusive selection option',
    category: 'Input',
    icon: 'CircleDot',
    defaultGeometry: { x: 0, y: 0, w: 120, h: 24 },
    defaultProps: { label: 'Option', enabled: true, visible: true },
    defaultStyle: { fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'Scale',
    label: 'Scale',
    description: 'Slider for numeric value selection',
    category: 'Input',
    icon: 'SlidersHorizontal',
    defaultGeometry: { x: 0, y: 0, w: 160, h: 40 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#89b4fa', font_family: 'Inter', font_size: 10, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'Combobox',
    label: 'Combobox',
    description: 'Dropdown list with selectable options',
    category: 'Input',
    icon: 'ChevronsUpDown',
    defaultGeometry: { x: 0, y: 0, w: 140, h: 28 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', padding: [4, 8], border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Spinbox',
    label: 'Spinbox',
    description: 'Numeric input with increment/decrement arrows',
    category: 'Input',
    icon: 'ArrowUpDown',
    defaultGeometry: { x: 0, y: 0, w: 100, h: 28 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', padding: [4, 8], border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  // Display widgets
  {
    type: 'Label',
    label: 'Label',
    description: 'Static text display',
    category: 'Display',
    icon: 'Type',
    defaultGeometry: { x: 0, y: 0, w: 120, h: 24 },
    defaultProps: { label: 'Label', enabled: true, visible: true },
    defaultStyle: { fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'Text',
    label: 'Text',
    description: 'Multi-line text display or editor',
    category: 'Display',
    icon: 'AlignLeft',
    defaultGeometry: { x: 0, y: 0, w: 240, h: 120 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'JetBrains Mono', font_size: 10, font_weight: 'normal', padding: [8, 8], border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Listbox',
    label: 'Listbox',
    description: 'Scrollable list of items',
    category: 'Display',
    icon: 'List',
    defaultGeometry: { x: 0, y: 0, w: 160, h: 120 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', padding: [4, 4], border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Canvas',
    label: 'Canvas',
    description: '2D drawing surface for custom graphics',
    category: 'Display',
    icon: 'Paintbrush',
    defaultGeometry: { x: 0, y: 0, w: 300, h: 200 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#1e1e2e', fg: '#cdd6f4', font_family: 'Inter', font_size: 10, font_weight: 'normal', border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  // Container widgets
  {
    type: 'Frame',
    label: 'Frame',
    description: 'Rectangular container for grouping widgets',
    category: 'Container',
    icon: 'Square',
    defaultGeometry: { x: 0, y: 0, w: 200, h: 150 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'flat' },
    hasChildren: true,
  },
  {
    type: 'GridContainer',
    label: 'Grid Container',
    description: 'Container with grid-based layout manager',
    category: 'Container',
    icon: 'LayoutGrid',
    defaultGeometry: { x: 0, y: 0, w: 300, h: 200 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'flat' },
    hasChildren: true,
  },
  {
    type: 'LabelFrame',
    label: 'LabelFrame',
    description: 'Bordered frame with a title label',
    category: 'Container',
    icon: 'PanelTop',
    defaultGeometry: { x: 0, y: 0, w: 220, h: 160 },
    defaultProps: { label: 'Group', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'bold', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'groove' },
    hasChildren: true,
  },
  {
    type: 'Notebook',
    label: 'Notebook',
    description: 'Tabbed container with multiple pages',
    category: 'Container',
    icon: 'BookOpen',
    defaultGeometry: { x: 0, y: 0, w: 320, h: 240 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'flat' },
    hasChildren: true,
  },
  {
    type: 'PanedWindow',
    label: 'PanedWindow',
    description: 'Resizable split container',
    category: 'Container',
    icon: 'Columns',
    defaultGeometry: { x: 0, y: 0, w: 300, h: 200 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'flat' },
    hasChildren: true,
  },
  {
    type: 'Progressbar',
    label: 'Progressbar',
    description: 'Horizontal or vertical progress indicator',
    category: 'Display',
    icon: 'Activity',
    defaultGeometry: { x: 0, y: 0, w: 200, h: 20 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#89b4fa', font_family: 'Inter', font_size: 10, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'Treeview',
    label: 'Treeview',
    description: 'Hierarchical table with sortable columns',
    category: 'Display',
    icon: 'Table',
    defaultGeometry: { x: 0, y: 0, w: 300, h: 200 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 10, font_weight: 'normal', border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Separator',
    label: 'Separator',
    description: 'Visual divider line',
    category: 'Display',
    icon: 'Minus',
    defaultGeometry: { x: 0, y: 0, w: 200, h: 2 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#45475a', fg: '#45475a', font_family: 'Inter', font_size: 1, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'Scrollbar',
    label: 'Scrollbar',
    description: 'Scroll bar for scrollable content',
    category: 'Input',
    icon: 'ScrollText',
    defaultGeometry: { x: 0, y: 0, w: 16, h: 120 },
    defaultProps: { label: '', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#585b70', font_family: 'Inter', font_size: 10, font_weight: 'normal' },
    hasChildren: false,
  },
  {
    type: 'OptionMenu',
    label: 'OptionMenu',
    description: 'Dropdown menu with a default selection',
    category: 'Input',
    icon: 'ListStart',
    defaultGeometry: { x: 0, y: 0, w: 140, h: 28 },
    defaultProps: { label: 'Select', enabled: true, visible: true },
    defaultStyle: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', padding: [4, 8], border_width: 1, border_color: '#585b70', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
  {
    type: 'Custom',
    label: 'Custom HTML',
    description: 'Custom widget built with HTML/CSS/JS',
    category: 'Display',
    icon: 'Code',
    defaultGeometry: { x: 0, y: 0, w: 300, h: 200 },
    defaultProps: { label: 'Custom', enabled: true, visible: true },
    defaultStyle: { bg: '#1e1e2e', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'normal', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'flat' },
    hasChildren: false,
  },
];

export const WIDGET_CATEGORIES: { key: string; label: string }[] = [
  { key: 'Container', label: 'Containers' },
  { key: 'Input', label: 'Input' },
  { key: 'Display', label: 'Display' },
  { key: 'Lab', label: 'Lab' },
];

export function getWidgetDef(type: WidgetType): WidgetDef | undefined {
  return WIDGET_DEFINITIONS.find((w) => w.type === type);
}

export function createDefaultNode(type: WidgetType, position: { x: number; y: number }, id: string): IRNode {
  const def = getWidgetDef(type);
  if (!def) {
    throw new Error(`Unknown widget type: ${type}`);
  }
  return {
    id,
    type,
    name: `${type.toLowerCase()}_${id.slice(0, 4)}`,
    abstract_props: { ...def.defaultProps },
    geometry: { ...def.defaultGeometry, x: position.x, y: position.y },
    style: { ...def.defaultStyle },
    events: [],
    children: [],
    locked: false,
    hidden: false,
  };
}
