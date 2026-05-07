/**
 * LabGUI Builder — Intermediate Representation (IR) Types
 * Single source of truth for the project state.
 */

export type UUID = string;

export type WidgetType =
  | 'Button'
  | 'Label'
  | 'Entry'
  | 'Text'
  | 'Frame'
  | 'Canvas'
  | 'Listbox'
  | 'Scale'
  | 'Checkbutton'
  | 'Radiobutton'
  | 'Combobox'
  | 'Spinbox'
  | 'GridContainer'
  | 'LabelFrame'
  | 'Notebook'
  | 'PanedWindow'
  | 'Progressbar'
  | 'Treeview'
  | 'Separator'
  | 'Scrollbar'
  | 'OptionMenu'
  | 'Custom';

export interface IRGeometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface IRStyle {
  bg?: string;
  fg?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  padding?: [number, number];
  border_width?: number;
  border_color?: string;
  border_radius?: number;
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid';
}

export interface IREvent {
  name: string;
  handler_id?: string;
  inline_code?: string;
}

export interface IRAbstractProps {
  label?: string;
  enabled?: boolean;
  visible?: boolean;
  tooltip?: string;
  help_text?: string;
}

export interface IRNode {
  id: UUID;
  type: WidgetType;
  name: string;
  abstract_props: IRAbstractProps;
  geometry: IRGeometry;
  style?: IRStyle;
  events: IREvent[];
  children: IRNode[];
  parent?: UUID;
  locked?: boolean;
  hidden?: boolean;
  // Widget-specific extra props stored loosely
  widget_props?: Record<string, unknown>;
}

export interface IRGridContainerProps {
  rows: number;
  cols: number;
  row_weights?: number[];
  col_weights?: number[];
  padx?: number;
  pady?: number;
}

export interface IRStateVariable {
  id: UUID;
  name: string;
  type: 'string' | 'int' | 'float' | 'bool';
  default_value: string | number | boolean;
  format?: string;
  min?: number;
  max?: number;
}

export interface IRInstrumentCommand {
  id: UUID;
  name: string;
  send: string;
  parse: 'string' | 'float' | 'int' | 'bool' | 'raw';
  timeout?: number;
}

export interface IRInstrument {
  id: UUID;
  name: string;
  protocol: 'visa' | 'serial';
  config: Record<string, unknown>;
  commands: IRInstrumentCommand[];
}

export interface IRDataLogger {
  id: UUID;
  sources: string[]; // state variable names
  format: 'csv';
  path: string;
  interval_ms: number;
  max_file_size_mb: number;
  enabled: boolean;
}

export interface IRAlarm {
  id: UUID;
  source: string; // state variable name
  min?: number;
  max?: number;
  hysteresis?: number;
  action: 'visual' | 'audio' | 'log';
  enabled: boolean;
}

export interface IRDocument {
  version: string;
  project_name: string;
  created_at: string;
  modified_at: string;
  root: IRNode;
  state_variables: IRStateVariable[];
  instruments: IRInstrument[];
  data_loggers: IRDataLogger[];
  alarms: IRAlarm[];
  settings: {
    window_title: string;
    window_width: number;
    window_height: number;
    theme: string;
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
