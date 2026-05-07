# LabGUI Builder — IR Schema & Code Generation Pipeline Specification

## Document Information

| Field | Value |
|---|---|
| Version | 1.0.0 |
| Status | Implementation-Ready |
| Target | tkinter (Phase 1) |
| Code Generator | `TkinterGenerator` (Python) |

---

## Table of Contents

1. [Complete IR Schema](#1-complete-ir-schema)
2. [Complete JSON Example](#2-complete-json-example)
3. [Tkinter Code Generator Design](#3-tkinter-code-generator-design)
4. [Schema Validation & Migration](#4-schema-validation--migration)
5. [Widget Property Defaults Table](#5-widget-property-defaults-table)

---

## 1. Complete IR Schema

### 1.1 Base Node

Every widget in the IR extends the base `IRNode`. All coordinates use CSS pixels (96 DPI).

```typescript
/** Unique identifier — UUID v4 */
type UUID = string;

/** All supported widget types in the LabGUI system */
type WidgetType =
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
  | 'GridContainer';

/** Base node from which every widget derives */
interface IRNode {
  id: UUID;
  type: WidgetType;
  name: string;                       // user-editable Python identifier (e.g., "btn_start")
  abstract_props: IRAbstractProps;
  geometry: IRGeometry;
  style?: IRStyle;
  events: IREvent[];
  children: IRNode[];                 // child widgets (tree structure)
  parent?: UUID;                      // parent node id
  locked?: boolean;                   // prevents designer modification
  hidden?: boolean;                   // hidden in designer (not runtime)
}

/** Abstract properties shared by all widgets */
interface IRAbstractProps {
  label?: string;                     // human-readable label / display text
  enabled?: boolean;                  // interactive state
  visible?: boolean;                  // rendered state
  tooltip?: string;                   // hover tooltip text
  help_text?: string;                 // longer help documentation
}

/** Geometry in CSS pixels (96 DPI baseline) */
interface IRGeometry {
  x: number;                          // left position
  y: number;                          // top position
  w: number;                          // width
  h: number;                          // height
}
```

### 1.2 Style Sub-schema

```typescript
/** Visual style properties */
interface IRStyle {
  bg?: string;                        // background color (hex, e.g. "#f0f0f0")
  fg?: string;                        // foreground/text color (hex)
  font_family?: string;               // font family name
  font_size?: number;                 // font size in points
  font_weight?: 'normal' | 'bold';    // font weight
  padding?: [number, number];         // [vertical, horizontal] in pixels
  border_width?: number;              // border width in pixels
  border_color?: string;              // border color (hex)
  border_radius?: number;             // corner radius in pixels (best-effort on tkinter)
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid'; // 3D border effect
}
```

### 1.3 Widget Types — Complete Property Sets

#### 1.3.1 Button

```typescript
interface IRButtonProps {
  text: string;                       // button label
  command: string;                    // callback method name (e.g., "on_btn_start_click")
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid';
  default_state?: 'active' | 'normal' | 'disabled'; // tkinter default/active/disabled
  image?: string;                     // optional icon path (base64 or file path)
  compound?: 'left' | 'right' | 'top' | 'bottom' | 'center';
  repeatdelay?: number;               // ms delay for auto-repeat
  repeatinterval?: number;            // ms interval for auto-repeat
  takefocus?: boolean;
}

interface IRButton extends IRNode {
  type: 'Button';
  widget_props: IRButtonProps;
}
```

#### 1.3.2 Label

```typescript
interface IRLabelProps {
  text: string;                       // display text
  textvariable?: string;              // bound state variable name
  anchor?: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw' | 'center';
  wraplength?: number;                // pixels before wrapping
  justify?: 'left' | 'center' | 'right';
  image?: string;                     // optional image path
  compound?: 'left' | 'right' | 'top' | 'bottom' | 'center';
}

interface IRLabel extends IRNode {
  type: 'Label';
  widget_props: IRLabelProps;
}
```

#### 1.3.3 Entry

```typescript
interface IREntryProps {
  textvariable?: string;              // bound state variable name
  show?: string;                      // character to display (e.g., "*" for passwords)
  state?: 'normal' | 'disabled' | 'readonly';
  validate?: 'none' | 'focus' | 'focusin' | 'focusout' | 'key' | 'all';
  validatecommand?: string;           // callback for validation
  width?: number;                     // character width
  justify?: 'left' | 'center' | 'right';
  selectbackground?: string;          // selection highlight color
  selectforeground?: string;
  exportselection?: boolean;          // copy to clipboard on select
  xscrollcommand?: string;            // scrollbar callback for horizontal scroll
  takefocus?: boolean;
}

interface IREntry extends IRNode {
  type: 'Entry';
  widget_props: IREntryProps;
}
```

#### 1.3.4 Text

```typescript
interface IRTextProps {
  text?: string;                      // initial content
  textvariable?: string;              // bound state variable name
  wrap?: 'none' | 'char' | 'word';    // line wrapping mode
  state?: 'normal' | 'disabled';
  height?: number;                    // height in lines
  width?: number;                     // width in characters
  padx?: number;                      // internal horizontal padding
  pady?: number;                      // internal vertical padding
  undo?: boolean;                     // enable undo/redo
  maxundo?: number;                   // max undo levels
  autoseparators?: boolean;
  tabs?: string;                      // tab stops
  spacing1?: number;                  // extra spacing above first line
  spacing2?: number;                  // extra spacing between lines
  spacing3?: number;                  // extra spacing below last line
  xscrollcommand?: string;            // horizontal scrollbar
  yscrollcommand?: string;            // vertical scrollbar
  exportselection?: boolean;
  takefocus?: boolean;
  setgrid?: boolean;
}

interface IRText extends IRNode {
  type: 'Text';
  widget_props: IRTextProps;
}
```

#### 1.3.5 Frame

```typescript
interface IRFrameProps {
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid';
  borderwidth?: number;
  label?: string;                     // if set, behaves like LabelFrame
  labelanchor?: 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';
  padding?: [number, number];         // [vertical, horizontal]
  takefocus?: boolean;
  container?: boolean;                // use as container widget
}

interface IRFrame extends IRNode {
  type: 'Frame';
  widget_props: IRFrameProps;
}
```

#### 1.3.6 Canvas

```typescript
interface IRCanvasProps {
  scrollregion?: [number, number, number, number]; // [x1, y1, x2, y2] scrollable area
  confine?: boolean;                  // restrict scrolling to scrollregion
  closeenough?: number;               // pixel tolerance for hit detection
  xscrollcommand?: string;
  yscrollcommand?: string;
  xscrollincrement?: number;
  yscrollincrement?: number;
  selectbackground?: string;
  selectforeground?: string;
  selectborderwidth?: number;
  insertbackground?: string;
  insertborderwidth?: number;
  insertwidth?: number;
  insertontime?: number;              // cursor blink on time (ms)
  insertofftime?: number;             // cursor blink off time (ms)
}

interface IRCanvas extends IRNode {
  type: 'Canvas';
  widget_props: IRCanvasProps;
}
```

#### 1.3.7 Listbox

```typescript
interface IRListboxProps {
  values?: string[];                  // initial list items
  selectmode?: 'single' | 'browse' | 'multiple' | 'extended';
  height?: number;                    // number of visible lines
  width?: number;                     // character width
  listvariable?: string;              // bound StringVar (space-separated values)
  activestyle?: 'none' | 'dotbox' | 'underline';
  exportselection?: boolean;
  selectbackground?: string;
  selectforeground?: string;
  selectborderwidth?: number;
  setgrid?: boolean;
  state?: 'normal' | 'disabled';
  xscrollcommand?: string;
  yscrollcommand?: string;
  takefocus?: boolean;
}

interface IRListbox extends IRNode {
  type: 'Listbox';
  widget_props: IRListboxProps;
}
```

#### 1.3.8 Scale

```typescript
interface IRScaleProps {
  orient?: 'horizontal' | 'vertical';
  from_: number;                       // minimum value
  to: number;                          // maximum value
  resolution?: number;                 // increment step (default: 1)
  tickinterval?: number;               // interval for tick marks (0 = none)
  variable?: string;                   // bound DoubleVar/IntVar name
  digits?: number;                     // precision digits
  showvalue?: boolean;                 // display current value
  sliderlength?: number;               // slider handle length in pixels
  sliderrelief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid';
  length?: number;                     // long-axis length in pixels
  width?: number;                      // short-axis width in pixels
  troughcolor?: string;
  borderwidth?: number;
  command?: string;                    // callback on value change
  state?: 'normal' | 'active' | 'disabled';
  takefocus?: boolean;
}

interface IRScale extends IRNode {
  type: 'Scale';
  widget_props: IRScaleProps;
}
```

#### 1.3.9 Checkbutton

```typescript
interface IRCheckbuttonProps {
  text: string;                       // label text
  variable?: string;                  // bound BooleanVar name
  onvalue?: string | number | boolean; // value when checked (default: true)
  offvalue?: string | number | boolean; // value when unchecked (default: false)
  indicatoron?: boolean;              // show checkbox indicator (false = button style)
  command?: string;                   // callback on toggle
  selectcolor?: string;               // indicator color when selected
  selectimage?: string;               // image when selected
  tristatevalue?: string;             // value for tristate
  tristateimage?: string;
  width?: number;
  height?: number;
  anchor?: string;
  justify?: 'left' | 'center' | 'right';
  state?: 'normal' | 'active' | 'disabled';
  takefocus?: boolean;
}

interface IRCheckbutton extends IRNode {
  type: 'Checkbutton';
  widget_props: IRCheckbuttonProps;
}
```

#### 1.3.10 Radiobutton

```typescript
interface IRRadiobuttonProps {
  text: string;                       // label text
  variable?: string;                  // shared variable name (group identifier)
  value: string | number | boolean;   // this button's value
  indicatoron?: boolean;              // show radio indicator (false = button style)
  command?: string;                   // callback on selection
  selectcolor?: string;
  selectimage?: string;
  tristatevalue?: string;
  width?: number;
  height?: number;
  anchor?: string;
  justify?: 'left' | 'center' | 'right';
  state?: 'normal' | 'active' | 'disabled';
  takefocus?: boolean;
}

interface IRRadiobutton extends IRNode {
  type: 'Radiobutton';
  widget_props: IRRadiobuttonProps;
}
```

#### 1.3.11 Combobox

```typescript
interface IRComboboxProps {
  values: string[];                   // dropdown options
  textvariable?: string;              // bound StringVar name
  state?: 'readonly' | 'normal';      // readonly = user can only select from list
  width?: number;                     // character width
  height?: number;                    // max dropdown rows visible
  exportselection?: boolean;
  justify?: 'left' | 'center' | 'right';
  postcommand?: string;               // callback before dropdown opens
  validate?: 'none' | 'focus' | 'focusin' | 'focusout' | 'key' | 'all';
  validatecommand?: string;
  takefocus?: boolean;
}

interface IRCombobox extends IRNode {
  type: 'Combobox';
  widget_props: IRComboboxProps;
}
```

#### 1.3.12 Spinbox

```typescript
interface IRSpinboxProps {
  from_?: number;                     // numeric range start
  to?: number;                        // numeric range end
  increment?: number;                 // step size (default: 1)
  values?: string[];                  // explicit list of values (overrides from_/to)
  textvariable?: string;              // bound variable name
  wrap?: boolean;                     // wrap around at range boundaries
  width?: number;
  format?: string;                    // printf-style format string (e.g., "%02.0f")
  command?: string;                   // callback on change
  validate?: 'none' | 'focus' | 'focusin' | 'focusout' | 'key' | 'all';
  validatecommand?: string;
  exportselection?: boolean;
  state?: 'normal' | 'disabled' | 'readonly' | 'active';
  justify?: 'left' | 'center' | 'right';
  takefocus?: boolean;
  xscrollcommand?: string;
  repeatdelay?: number;
  repeatinterval?: number;
}

interface IRSpinbox extends IRNode {
  type: 'Spinbox';
  widget_props: IRSpinboxProps;
}
```

#### 1.3.13 GridContainer

```typescript
interface IRGridWeightConfig {
  index: number;                      // row or column index
  weight: number;                     // resize weight (0 = fixed size)
  minsize?: number;                   // minimum size in pixels
  pad?: number;                       // padding in pixels
}

interface IRGridContainerProps {
  rows: number;                       // number of rows
  columns: number;                    // number of columns
  padding?: [number, number];         // [vertical, horizontal] cell padding
  row_weights?: IRGridWeightConfig[]; // row resize weights
  col_weights?: IRGridWeightConfig[]; // column resize weights
  uniform_rows?: string;              // group name for uniform row sizing
  uniform_cols?: string;              // group name for uniform column sizing
  sticky_default?: string;            // default sticky value for children (e.g., "nsew")
  borderwidth?: number;
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid';
  label?: string;                     // optional frame label
}

interface IRGridContainer extends IRNode {
  type: 'GridContainer';
  widget_props: IRGridContainerProps;
}
```

### 1.4 Event Binding Schema

```typescript
/** Supported event types */
type EventType =
  | 'on_click'
  | 'on_double_click'
  | 'on_change'
  | 'on_focus'
  | 'on_blur'
  | 'on_enter'          // mouse enters widget
  | 'on_leave'          // mouse leaves widget
  | 'on_key_press'
  | 'on_key_release'
  | 'on_mouse_wheel'
  | 'on_resize'
  | 'on_validate';      // input validation event

/** Event binding definition */
interface IREvent {
  type: EventType;
  callback_name: string;              // Python method name (e.g., "on_start_click")
  code?: string;                      // optional injected Python code body
  args?: string[];                    // additional argument names for the callback
  description?: string;               // human-readable description
}
```

### 1.5 State Variable Schema

```typescript
/** Supported state variable types */
type StateVarType = 'string' | 'int' | 'float' | 'bool';

/** State variable for two-way widget binding */
interface IRStateVariable {
  id: UUID;
  name: string;                       // Python identifier (e.g., "voltage")
  type: StateVarType;
  default: string | number | boolean;
  format?: string;                    // display format (e.g., "%.4f V")
  description?: string;
  min?: number;                       // optional minimum value
  max?: number;                       // optional maximum value
  readonly?: boolean;
  persist?: boolean;                  // save/restore across sessions
}
```

### 1.6 Instrument Schema

```typescript
/** Communication protocol types */
type InstrumentProtocol = 'visa' | 'serial' | 'tcp' | 'udp' | 'modbus';

/** Instrument configuration (protocol-specific) */
interface IRInstrumentConfig {
  // ── VISA ──
  resource_string?: string;           // e.g., "GPIB0::22::INSTR"
  backend?: 'pyvisa' | 'pyvisa-py' | '@py';
  // ── Serial ──
  port?: string;                      // e.g., "COM3" or "/dev/ttyUSB0"
  baudrate?: number;                  // default: 9600
  bytesize?: 7 | 8;
  parity?: 'N' | 'E' | 'O';
  stopbits?: 1 | 1.5 | 2;
  timeout?: number;                   // seconds
  rtscts?: boolean;                   // RTS/CTS flow control
  dsrdtr?: boolean;                   // DSR/DTR flow control
  xonxoff?: boolean;                  // software flow control
  // ── TCP / UDP ──
  host?: string;                      // IP or hostname
  tcp_port?: number;
  udp_port?: number;
  connect_timeout?: number;           // seconds
  // ── Modbus ──
  unit_id?: number;                   // Modbus slave address
  function_code?: 'read_holding' | 'read_input' | 'write_single' | 'write_multiple';
  register_address?: number;
  register_count?: number;
}

/** Single instrument command definition */
interface IRInstrumentCommand {
  id: UUID;
  name: string;                       // Python identifier (e.g., "read_voltage")
  display_name?: string;              // human-readable name
  send: string;                       // command string (e.g., "MEAS:VOLT?\\n")
  parse_type: 'float' | 'int' | 'string' | 'bytes' | 'regex' | 'json' | 'none';
  parse_pattern?: string;             // regex pattern (if parse_type=regex)
  parse_json_path?: string;           // JSON path (if parse_type=json)
  timeout?: number;                   // response timeout in ms
  delay_before?: number;              // delay before sending (ms)
  delay_after?: number;               // delay after sending (ms)
  terminator?: string;                // response terminator (e.g., "\\n")
  description?: string;
}

/** Binding from instrument command output to widget/state */
interface IRInstrumentBinding {
  id: UUID;
  command_id: UUID;                   // references IRInstrumentCommand.id
  target_type: 'widget' | 'state' | 'both';
  target_id: string;                  // widget id or state variable name
  target_property: string;            // e.g., "text", "value", "insert"
  mode: 'polled' | 'triggered' | 'manual';
  interval_ms?: number;               // for polled mode
  trigger_event?: string;             // e.g., "on_click" of a specific button
  trigger_widget_id?: UUID;           // widget that triggers the binding
  transform?: string;                 // optional Python expression to transform value
  enabled: boolean;
}

/** Instrument definition */
interface IRInstrument {
  id: UUID;
  name: string;                       // Python identifier
  display_name?: string;
  protocol: InstrumentProtocol;
  config: IRInstrumentConfig;
  commands: IRInstrumentCommand[];
  bindings: IRInstrumentBinding[];
  auto_connect?: boolean;             // connect on startup
  reconnect?: boolean;                // auto-reconnect on failure
  reconnect_interval_ms?: number;
  description?: string;
  enabled: boolean;
}
```

### 1.7 Data Logger Schema

```typescript
/** Supported log output formats */
type LogFormat = 'csv' | 'json' | 'tsv';

/** Timestamp format options */
type TimestampFormat = 'iso' | 'unix_ms' | 'unix_s' | 'elapsed_ms' | 'elapsed_s';

/** Data logger for recording state variables to file */
interface IRDataLogger {
  id: UUID;
  name: string;                       // Python identifier
  sources: string[];                  // state variable names to log
  format: LogFormat;
  file_path: string;                  // output file path (supports {date}, {time} placeholders)
  interval_ms: number;                // logging interval
  max_file_size_mb: number;           // rotate when exceeded (0 = no limit)
  max_files?: number;                 // number of rotated files to keep
  include_timestamp: boolean;
  timestamp_format: TimestampFormat;
  header_style?: 'none' | 'once' | 'each'; // write header frequency
  enabled: boolean;
  description?: string;
}
```

### 1.8 Alarm Schema

```typescript
/** Alarm condition operators */
type AlarmCondition = 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' | 'in_range' | 'out_of_range' | 'changed';

/** Alarm severity level */
type AlarmSeverity = 'info' | 'warning' | 'critical';

/** Individual alarm action */
interface IRAlarmAction {
  id: UUID;
  type: 'visual' | 'log' | 'script' | 'sound' | 'notification';
  enabled: boolean;
  // ── visual ──
  target_widget?: string;             // widget name to flash/modify
  flash_color?: string;               // color for visual alert
  flash_duration_ms?: number;         // how long to flash
  flash_count?: number;               // number of flashes
  set_widget_state?: 'normal' | 'disabled' | 'hidden'; // change widget state
  // ── log ──
  log_level?: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  log_message?: string;               // supports {value}, {threshold}, {name} placeholders
  log_target?: 'console' | 'file' | 'both';
  log_file_path?: string;
  // ── script ──
  script?: string;                    // injected Python code
  // ── sound ──
  sound_file?: string;
  // ── notification ──
  notification_title?: string;
  notification_message?: string;
}

/** Alarm definition */
interface IRAlarm {
  id: UUID;
  name: string;                       // Python identifier
  display_name?: string;
  source: string;                     // state variable name to monitor
  source_property?: string;           // if source is widget, which property
  condition: AlarmCondition;
  threshold: number | [number, number]; // single value or [min, max] for range
  severity: AlarmSeverity;
  actions: IRAlarmAction[];
  debounce_ms?: number;               // minimum time between triggers
  cooldown_ms?: number;               // time before alarm can re-trigger
  enabled: boolean;
  auto_acknowledge?: boolean;         // auto-reset when condition clears
  description?: string;
}
```

### 1.9 Complete Project IR (Root)

```typescript
/** Project theme configuration */
interface IRTheme {
  palette: 'default' | 'dark' | 'light' | 'custom';
  primary_color?: string;             // hex
  secondary_color?: string;           // hex
  danger_color?: string;              // hex (alarms, errors)
  warning_color?: string;             // hex (warnings)
  success_color?: string;             // hex (ok/complete)
  info_color?: string;                // hex (information)
  background_color?: string;          // hex (canvas bg)
  surface_color?: string;             // hex (widget bg)
  text_primary_color?: string;        // hex (main text)
  text_secondary_color?: string;      // hex (labels, hints)
  font_family?: string;
  font_size?: number;
  border_radius?: number;
}

/** Designer canvas configuration */
interface IRCanvas {
  width: number;                      // canvas width in CSS pixels
  height: number;                     // canvas height in CSS pixels
  bg_color: string;                   // background color (hex)
  grid_size: number;                  // snap-to-grid step (0 = off)
  grid_visible: boolean;              // show grid dots/lines in designer
  grid_color?: string;                // grid line color
  zoom_level?: number;                // designer zoom (1.0 = 100%)
  show_guides?: boolean;              // show alignment guides
}

/** Project metadata */
interface IRMetadata {
  created: string;                    // ISO 8601 timestamp
  modified: string;                   // ISO 8601 timestamp
  author?: string;
  description?: string;
  tkinter_version?: string;           // target tkinter version
  python_version?: string;            // target Python version
  tags?: string[];
}

/** Root project structure — the .gui.json file */
interface IRProject {
  version: string;                    // IR schema version (semver, e.g., "1.0.0")
  name: string;                       // project name
  metadata: IRMetadata;
  canvas: IRCanvas;
  widgets: IRNode[];                  // root-level widget tree
  state_variables: IRStateVariable[];
  instruments: IRInstrument[];
  data_loggers: IRDataLogger[];
  alarms: IRAlarm[];
  theme: IRTheme;
}
```

---

## 2. Complete JSON Example

### "Multimeter Readout" Project

This example demonstrates a complete LabGUI project for a digital multimeter readout application. It includes widgets, state variables, a VISA instrument, instrument bindings, data logging, and an over-voltage alarm.

```json
{
  "version": "1.0.0",
  "name": "Multimeter Readout",
  "metadata": {
    "created": "2025-01-15T09:30:00Z",
    "modified": "2025-01-15T14:22:00Z",
    "author": "Lab Technician",
    "description": "Digital multimeter voltage readout with logging and over-voltage alarm",
    "tkinter_version": "8.6",
    "python_version": "3.10"
  },
  "canvas": {
    "width": 800,
    "height": 600,
    "bg_color": "#1e1e2e",
    "grid_size": 10,
    "grid_visible": true,
    "grid_color": "#313244",
    "zoom_level": 1.0,
    "show_guides": true
  },
  "widgets": [
    {
      "id": "a1b2c3d4-1111-2222-3333-444455556666",
      "type": "Label",
      "name": "lbl_title",
      "abstract_props": {
        "label": "Voltage Monitor",
        "enabled": true,
        "visible": true,
        "tooltip": "Main voltage display title"
      },
      "geometry": { "x": 20, "y": 20, "w": 300, "h": 40 },
      "style": {
        "fg": "#cdd6f4",
        "font_family": "Segoe UI",
        "font_size": 20,
        "font_weight": "bold"
      },
      "events": [],
      "children": [],
      "widget_props": {
        "text": "Voltage Monitor",
        "anchor": "w",
        "justify": "left"
      }
    },
    {
      "id": "a1b2c3d4-1111-2222-3333-444455557777",
      "type": "Label",
      "name": "lbl_voltage_label",
      "abstract_props": {
        "label": "Voltage",
        "enabled": true,
        "visible": true
      },
      "geometry": { "x": 50, "y": 90, "w": 120, "h": 30 },
      "style": {
        "fg": "#a6adc8",
        "font_family": "Segoe UI",
        "font_size": 14
      },
      "events": [],
      "children": [],
      "widget_props": {
        "text": "Voltage:",
        "anchor": "e",
        "justify": "right"
      }
    },
    {
      "id": "a1b2c3d4-1111-2222-3333-444455558888",
      "type": "Label",
      "name": "lbl_voltage_display",
      "abstract_props": {
        "label": "Voltage Display",
        "enabled": true,
        "visible": true,
        "tooltip": "Current voltage reading"
      },
      "geometry": { "x": 180, "y": 80, "w": 200, "h": 50 },
      "style": {
        "bg": "#313244",
        "fg": "#89dceb",
        "font_family": "Consolas",
        "font_size": 28,
        "font_weight": "bold",
        "border_width": 2,
        "border_color": "#45475a",
        "border_radius": 8,
        "padding": [5, 10]
      },
      "events": [],
      "children": [],
      "widget_props": {
        "text": "0.0000 V",
        "textvariable": "voltage",
        "anchor": "center",
        "justify": "center"
      }
    },
    {
      "id": "a1b2c3d4-1111-2222-3333-444455559999",
      "type": "Button",
      "name": "btn_read",
      "abstract_props": {
        "label": "Read",
        "enabled": true,
        "visible": true,
        "tooltip": "Trigger a voltage reading"
      },
      "geometry": { "x": 50, "y": 160, "w": 120, "h": 40 },
      "style": {
        "bg": "#89b4fa",
        "fg": "#1e1e2e",
        "font_family": "Segoe UI",
        "font_size": 12,
        "font_weight": "bold",
        "border_radius": 6
      },
      "events": [
        {
          "type": "on_click",
          "callback_name": "on_btn_read_click",
          "description": "Trigger voltage reading from multimeter"
        }
      ],
      "children": [],
      "widget_props": {
        "text": "Read",
        "command": "on_btn_read_click",
        "relief": "flat",
        "default_state": "normal"
      }
    },
    {
      "id": "a1b2c3d4-1111-2222-3333-44445555aaaa",
      "type": "Button",
      "name": "btn_stop",
      "abstract_props": {
        "label": "Stop",
        "enabled": true,
        "visible": true,
        "tooltip": "Stop continuous reading"
      },
      "geometry": { "x": 190, "y": 160, "w": 120, "h": 40 },
      "style": {
        "bg": "#f38ba8",
        "fg": "#1e1e2e",
        "font_family": "Segoe UI",
        "font_size": 12,
        "font_weight": "bold",
        "border_radius": 6
      },
      "events": [
        {
          "type": "on_click",
          "callback_name": "on_btn_stop_click",
          "code": "self.var_running.set(False)\nself.lbl_status.config(text='Stopped', fg='#f38ba8')",
          "description": "Stop continuous reading mode"
        }
      ],
      "children": [],
      "widget_props": {
        "text": "Stop",
        "command": "on_btn_stop_click",
        "relief": "flat",
        "default_state": "normal"
      }
    },
    {
      "id": "a1b2c3d4-1111-2222-3333-44445555bbbb",
      "type": "Label",
      "name": "lbl_status",
      "abstract_props": {
        "label": "Status",
        "enabled": true,
        "visible": true
      },
      "geometry": { "x": 50, "y": 220, "w": 260, "h": 24 },
      "style": {
        "fg": "#a6e3a1",
        "font_family": "Segoe UI",
        "font_size": 11
      },
      "events": [],
      "children": [],
      "widget_props": {
        "text": "Ready",
        "anchor": "w",
        "justify": "left"
      }
    },
    {
      "id": "a1b2c3d4-1111-2222-3333-44445555cccc",
      "type": "Checkbutton",
      "name": "chk_continuous",
      "abstract_props": {
        "label": "Continuous Mode",
        "enabled": true,
        "visible": true,
        "tooltip": "Enable continuous reading mode"
      },
      "geometry": { "x": 50, "y": 260, "w": 200, "h": 28 },
      "style": {
        "fg": "#cdd6f4",
        "font_family": "Segoe UI",
        "font_size": 11,
        "selectcolor": "#89b4fa"
      },
      "events": [
        {
          "type": "on_change",
          "callback_name": "on_continuous_toggle",
          "description": "Toggle continuous reading"
        }
      ],
      "children": [],
      "widget_props": {
        "text": "Continuous Mode",
        "variable": "running",
        "onvalue": true,
        "offvalue": false,
        "indicatoron": true
      }
    }
  ],
  "state_variables": [
    {
      "id": "b2c3d4e5-1111-2222-3333-444455556666",
      "name": "voltage",
      "type": "float",
      "default": 0.0,
      "format": "%.4f V",
      "description": "Measured voltage from multimeter",
      "min": -1000.0,
      "max": 1000.0,
      "readonly": false,
      "persist": false
    },
    {
      "id": "b2c3d4e5-1111-2222-3333-444455557777",
      "name": "running",
      "type": "bool",
      "default": false,
      "description": "Continuous reading mode active",
      "readonly": false,
      "persist": true
    }
  ],
  "instruments": [
    {
      "id": "c3d4e5f6-1111-2222-3333-444455556666",
      "name": "multimeter",
      "display_name": "Keysight 34461A Multimeter",
      "protocol": "visa",
      "config": {
        "resource_string": "GPIB0::22::INSTR",
        "backend": "pyvisa",
        "timeout": 5.0
      },
      "commands": [
        {
          "id": "d4e5f6g7-1111-2222-3333-444455556666",
          "name": "read_voltage",
          "display_name": "Read DC Voltage",
          "send": "MEAS:VOLT:DC?\n",
          "parse_type": "float",
          "timeout": 5000,
          "delay_before": 0,
          "delay_after": 100,
          "terminator": "\n",
          "description": "Read DC voltage measurement"
        },
        {
          "id": "d4e5f6g7-1111-2222-3333-444455557777",
          "name": "read_idn",
          "display_name": "Identify",
          "send": "*IDN?\n",
          "parse_type": "string",
          "timeout": 2000,
          "description": "Query instrument identification"
        }
      ],
      "bindings": [
        {
          "id": "e5f6g7h8-1111-2222-3333-444455556666",
          "command_id": "d4e5f6g7-1111-2222-3333-444455556666",
          "target_type": "state",
          "target_id": "voltage",
          "target_property": "value",
          "mode": "triggered",
          "trigger_event": "on_click",
          "trigger_widget_id": "a1b2c3d4-1111-2222-3333-444455559999",
          "transform": "float(value) * 1.0",
          "enabled": true
        }
      ],
      "auto_connect": true,
      "reconnect": true,
      "reconnect_interval_ms": 5000,
      "description": "Keysight 34461A 6.5 digit multimeter",
      "enabled": true
    }
  ],
  "data_loggers": [
    {
      "id": "f6g7h8i9-1111-2222-3333-444455556666",
      "name": "voltage_logger",
      "sources": ["voltage"],
      "format": "csv",
      "file_path": "./logs/voltage_{date}.csv",
      "interval_ms": 1000,
      "max_file_size_mb": 10,
      "max_files": 7,
      "include_timestamp": true,
      "timestamp_format": "iso",
      "header_style": "once",
      "enabled": true,
      "description": "Log voltage readings to CSV"
    }
  ],
  "alarms": [
    {
      "id": "g7h8i9j0-1111-2222-3333-444455556666",
      "name": "overvoltage_alarm",
      "display_name": "Over-Voltage Alarm",
      "source": "voltage",
      "condition": "gt",
      "threshold": 250.0,
      "severity": "critical",
      "actions": [
        {
          "id": "h8i9j0k1-1111-2222-3333-444455556666",
          "type": "visual",
          "enabled": true,
          "target_widget": "lbl_voltage_display",
          "flash_color": "#f38ba8",
          "flash_duration_ms": 500,
          "flash_count": 5
        },
        {
          "id": "h8i9j0k1-1111-2222-3333-444455557777",
          "type": "log",
          "enabled": true,
          "log_level": "warning",
          "log_message": "ALARM: Voltage {value}V exceeds threshold {threshold}V",
          "log_target": "both",
          "log_file_path": "./logs/alarms.log"
        }
      ],
      "debounce_ms": 100,
      "cooldown_ms": 5000,
      "enabled": true,
      "auto_acknowledge": true,
      "description": "Trigger when measured voltage exceeds 250V"
    }
  ],
  "theme": {
    "palette": "dark",
    "primary_color": "#89b4fa",
    "secondary_color": "#b4befe",
    "danger_color": "#f38ba8",
    "warning_color": "#fab387",
    "success_color": "#a6e3a1",
    "info_color": "#89dceb",
    "background_color": "#1e1e2e",
    "surface_color": "#313244",
    "text_primary_color": "#cdd6f4",
    "text_secondary_color": "#a6adc8",
    "font_family": "Segoe UI",
    "font_size": 10,
    "border_radius": 6
  }
}
```



---

## 3. Tkinter Code Generator Design

### 3.1 Generator Architecture

The `TkinterGenerator` implements the **Visitor Pattern** to traverse the IR tree and emit clean, PEP8-compliant Python code.

```python
"""
Tkinter Code Generator — Visitor Pattern Implementation
=======================================================

Architecture:
    IRProject (dict/JSON)
        |
        v
    TkinterGenerator.visit_project(project)
        |
        +-- _emit_header()         # imports, module docstring
        +-- _emit_class_def()      # class MyApplication:
        +-- _emit_init()           # __init__ method orchestration
        |       +-- _init_state_variables()
        |       +-- _init_instruments()
        |       +-- _build_ui()
        |       +-- _init_data_loggers()
        |       +-- _init_alarms()
        +-- _emit_event_handlers() # user callback stubs
        +-- _emit_instrument_methods()  # auto-generated query methods
        +-- _emit_cleanup()        # on_closing, thread cleanup
        +-- _emit_main_block()     # if __name__ == "__main__"

    Each widget type has a dedicated visit_* method:
        visit_Button(node, parent_var, layout_method)
        visit_Label(node, parent_var, layout_method)
        visit_Entry(node, parent_var, layout_method)
        ... etc.

    Code is accumulated as List[str] and joined at the end.
"""
```

#### Generator Class Skeleton

```python
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field


@dataclass
class CodeBlock:
    """Represents a block of code with indent tracking."""
    lines: List[str] = field(default_factory=list)
    indent_level: int = 0
    indent_str: str = "    "  # 4 spaces (PEP8)

    def add(self, line: str):
        """Add a line with proper indentation."""
        if line.strip() == "":
            self.lines.append("")
        else:
            self.lines.append(self.indent_str * self.indent_level + line)

    def add_block(self, block: 'CodeBlock'):
        """Add all lines from another block."""
        for line in block.lines:
            if line.strip() == "":
                self.lines.append("")
            else:
                self.lines.append(self.indent_str * self.indent_level + line)

    def indented(self) -> 'CodeBlock':
        """Return a new block with increased indent."""
        child = CodeBlock(indent_level=self.indent_level + 1)
        return child

    def __str__(self) -> str:
        return "\n".join(self.lines)


class TkinterGenerator:
    """
    Generates clean, PEP8-compliant Python tkinter code from an IRProject.
    
    Usage:
        with open("project.gui.json") as f:
            project = json.load(f)
        
        gen = TkinterGenerator(project)
        code = gen.generate()
        
        with open("output.py", "w") as f:
            f.write(code)
    """

    # Indentation constants
    INDENT = "    "
    
    # tkinter widget class mapping
    WIDGET_CLASSES = {
        'Button': 'tk.Button',
        'Label': 'tk.Label',
        'Entry': 'tk.Entry',
        'Text': 'tk.Text',
        'Frame': 'tk.Frame',
        'Canvas': 'tk.Canvas',
        'Listbox': 'tk.Listbox',
        'Scale': 'tk.Scale',
        'Checkbutton': 'tk.Checkbutton',
        'Radiobutton': 'tk.Radiobutton',
        'Combobox': 'ttk.Combobox',
        'Spinbox': 'tk.Spinbox',
        'GridContainer': 'tk.LabelFrame',
    }

    def __init__(self, project: Dict[str, Any]):
        self.project = project
        self.class_name = self._to_class_name(project.get("name", "Application"))
        self.widgets_by_id: Dict[str, Dict] = {}  # flat lookup map
        self._build_widget_lookup()
        
        # Track which features are used (for conditional imports)
        self.uses_threading = False
        self.uses_pyvisa = False
        self.uses_serial = False
        self.uses_csv = False
        self.uses_datetime = False
        self.uses_ttk = False
        self.uses_tkmessagebox = False

    def _build_widget_lookup(self):
        """Build a flat lookup of all widgets by ID."""
        def walk(node):
            self.widgets_by_id[node["id"]] = node
            for child in node.get("children", []):
                walk(child)
        for widget in self.project.get("widgets", []):
            walk(widget)

    @staticmethod
    def _to_class_name(name: str) -> str:
        """Convert project name to valid Python class name."""
        return "".join(word.capitalize() for word in name.replace("-", " ").replace("_", " ").split())

    @staticmethod
    def _to_snake_case(name: str) -> str:
        """Ensure a valid Python snake_case identifier."""
        return name.lower().replace(" ", "_").replace("-", "_")

    @staticmethod
    def _hex_to_tk_color(hex_color: str) -> str:
        """Convert hex color to tkinter format (already compatible)."""
        return hex_color if hex_color.startswith("#") else f"#{hex_color}"

    def _style_kwargs(self, style: Optional[Dict], widget_type: str) -> List[str]:
        """Convert IRStyle to tkinter keyword arguments."""
        kwargs = []
        if not style:
            return kwargs
        
        if style.get("bg"):
            kwargs.append(f'bg="{style["bg"]}"')
        if style.get("fg"):
            kwargs.append(f'fg="{style["fg"]}"')
        if style.get("font_family"):
            font_size = style.get("font_size", 10)
            font_weight = style.get("font_weight", "normal")
            if font_weight == "bold":
                kwargs.append(f'font=("{style["font_family"]}", {font_size}, "bold")')
            else:
                kwargs.append(f'font=("{style["font_family"]}", {font_size})')
        if style.get("relief"):
            kwargs.append(f'relief="{style["relief"]}"')
        if style.get("border_width") is not None:
            kwargs.append(f'bd={style["border_width"]}')
        if style.get("border_color"):
            kwargs.append(f'highlightbackground="{style["border_color"]}"')
            kwargs.append(f'highlightcolor="{style["border_color"]}"')
        if style.get("border_radius"):
            # tkinter doesn't natively support border_radius; note for ttk themes
            kwargs.append(f'# border_radius={style["border_radius"]}  # (requires ttk theme)')
        
        return kwargs

    def generate(self) -> str:
        """Main entry point — generates the complete Python file."""
        code = CodeBlock()
        
        self._emit_header(code)
        code.add("")
        self._emit_class_def(code)
        code.add("")
        self._emit_init(code)
        code.add("")
        self._emit_state_variables(code)
        code.add("")
        self._emit_instruments(code)
        code.add("")
        self._emit_build_ui(code)
        code.add("")
        self._emit_data_loggers(code)
        code.add("")
        self._emit_alarms(code)
        code.add("")
        self._emit_event_handlers(code)
        code.add("")
        self._emit_instrument_methods(code)
        code.add("")
        self._emit_cleanup(code)
        code.add("")
        self._emit_main_block(code)
        
        return str(code)
```

---

### 3.2 Code Structure Template

The generated `.py` file follows this exact structure:

```python
#!/usr/bin/env python3
"""Generated by LabGUI Builder — do not hand-edit.

Project:    Multimeter Readout
Version:    1.0.0
Created:    2025-01-15T09:30:00Z
Author:     Lab Technician
"""

import tkinter as tk
from tkinter import ttk, messagebox
import threading
import time
import csv
from datetime import datetime


class MultimeterReadout:
    """Main application class for Multimeter Readout."""

    def __init__(self, root):
        self.root = root
        self.root.title("Multimeter Readout")
        self.root.geometry("800x600")
        self.root.configure(bg="#1e1e2e")

        # --- State Variables ---
        self._init_state_variables()

        # --- Instruments ---
        self._init_instruments()

        # --- Widgets ---
        self._build_ui()

        # --- Data Loggers ---
        self._init_data_loggers()

        # --- Alarms ---
        self._init_alarms()

    def _init_state_variables(self):
        """Initialize tkinter variable bindings."""
        self.var_voltage = tk.DoubleVar(value=0.0)
        self.var_running = tk.BooleanVar(value=False)

    def _init_instruments(self):
        """Initialize instrument connections."""
        import pyvisa
        self.rm = pyvisa.ResourceManager()
        self.instr_multimeter = self.rm.open_resource("GPIB0::22::INSTR")
        self.instr_multimeter.timeout = 5000

    def _build_ui(self):
        """Build all widgets."""
        # lbl_title: Label
        self.lbl_title = tk.Label(
            self.root,
            text="Voltage Monitor",
            fg="#cdd6f4",
            font=("Segoe UI", 20, "bold"),
            anchor="w",
            justify="left",
        )
        self.lbl_title.place(x=20, y=20, width=300, height=40)

        # ... more widgets ...

    def _init_data_loggers(self):
        """Initialize data logging threads."""
        self._logger_running = True
        self._logger_thread = threading.Thread(
            target=self._logger_loop,
            daemon=True,
        )
        self._logger_thread.start()

    def _init_alarms(self):
        """Initialize alarm monitoring threads."""
        self._alarm_running = True
        self._alarm_thread = threading.Thread(
            target=self._alarm_loop,
            daemon=True,
        )
        self._alarm_thread.start()

    # --- Event Handlers ---
    def on_btn_read_click(self):
        """Trigger voltage reading from multimeter."""
        pass

    def on_btn_stop_click(self):
        """Stop continuous reading mode."""
        self.var_running.set(False)
        self.lbl_status.config(text="Stopped", fg="#f38ba8")

    def on_continuous_toggle(self):
        """Toggle continuous reading."""
        pass

    # --- Instrument Methods ---
    def _instr_read_voltage(self):
        """Read voltage from multimeter."""
        try:
            self.instr_multimeter.write("MEAS:VOLT:DC?\n")
            response = self.instr_multimeter.read()
            value = float(response)
            self.root.after(0, lambda v=value: self.var_voltage.set(v))
        except Exception as e:
            print(f"Instrument error (read_voltage): {e}")

    # --- Cleanup ---
    def on_closing(self):
        """Clean up resources before application exit."""
        self._logger_running = False
        self._alarm_running = False
        if hasattr(self, "_logger_thread"):
            self._logger_thread.join(timeout=2.0)
        if hasattr(self, "_alarm_thread"):
            self._alarm_thread.join(timeout=2.0)
        if hasattr(self, "instr_multimeter"):
            self.instr_multimeter.close()
        if hasattr(self, "rm"):
            self.rm.close()
        self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    app = MultimeterReadout(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
```

---

### 3.3 Widget Code Generation (Per Type)

Each widget type generates code following this pattern:

```python
def visit_WidgetType(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate code for a specific widget type."""
    name = node["name"]
    props = node.get("widget_props", {})
    style = node.get("style", {})
    geometry = node.get("geometry", {})
    
    lines = []
    lines.append(f"# {name}: {node['type']}")
    
    # Collect constructor kwargs
    kwargs = self._style_kwargs(style, node["type"])
    # ... add widget-specific kwargs from props
    
    kwargs_str = ",\n    ".join(kwargs) if kwargs else ""
    
    widget_class = self.WIDGET_CLASSES[node["type"]]
    lines.append(f"self.{name} = {widget_class}(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    # Layout
    if self._is_inside_grid_container(node):
        lines.extend(self._emit_grid_layout(node, parent_var))
    else:
        lines.append(
            f"self.{name}.place("
            f'x={geometry["x"]}, y={geometry["y"]}, '
            f'width={geometry["w"]}, height={geometry["h"]})'
        )
    
    lines.append("")
    return lines
```

#### 3.3.1 Button

**IR properties → tkinter mapping:**

| IR Property | tkinter Option | Notes |
|---|---|---|
| `text` | `text` | Button label |
| `command` | `command` | Method reference via `getattr(self, cmd_name)` |
| `relief` | `relief` | Border style |
| `default_state` | N/A | Handled via `state()` call after creation |
| `image` | `image` | Requires `tk.PhotoImage` |
| `compound` | `compound` | Image + text positioning |
| `repeatdelay` | `repeatdelay` | Auto-repeat (ms) |
| `repeatinterval` | `repeatinterval` | Auto-repeat interval (ms) |
| `takefocus` | `takefocus` | Tab order inclusion |

**Generated code:**

```python
def visit_Button(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Button code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    geo = node.get("geometry", {})
    
    lines = []
    lines.append(f"# {name}: Button")
    
    kwargs = []
    kwargs.append(f'text="{p.get("text", "")}"')
    
    if p.get("command"):
        kwargs.append(f'command=self.{p["command"]}')
    if p.get("relief"):
        kwargs.append(f'relief="{p["relief"]}"')
    if p.get("compound"):
        kwargs.append(f'compound="{p["compound"]}"')
    if p.get("repeatdelay") is not None:
        kwargs.append(f'repeatdelay={p["repeatdelay"]}')
    if p.get("repeatinterval") is not None:
        kwargs.append(f'repeatinterval={p["repeatinterval"]}')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={str(p["takefocus"])}')
    
    # Style kwargs
    kwargs.extend(self._style_kwargs(style, "Button"))
    
    # Constructor
    lines.append(f"self.{name} = tk.Button(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    # Apply default_state if not "normal"
    if p.get("default_state") and p["default_state"] != "normal":
        if p["default_state"] == "active":
            lines.append(f'self.{name}.config(state="active")')
        elif p["default_state"] == "disabled":
            lines.append(f'self.{name}.config(state="disabled")')
    
    # Layout
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# btn_read: Button
self.btn_read = tk.Button(
    self.root,
    text="Read",
    command=self.on_btn_read_click,
    relief="flat",
    bg="#89b4fa",
    fg="#1e1e2e",
    font=("Segoe UI", 12, "bold"),
)
self.btn_read.place(x=50, y=160, width=120, height=40)
```

#### 3.3.2 Label

**IR properties → tkinter mapping:**

| IR Property | tkinter Option | Notes |
|---|---|---|
| `text` | `text` | Display text |
| `textvariable` | `textvariable` | Bound `StringVar`/`DoubleVar` reference |
| `anchor` | `anchor` | Text anchor: n, ne, e, se, s, sw, w, nw, center |
| `wraplength` | `wraplength` | Pixel width before wrapping |
| `justify` | `justify` | Text justification: left, center, right |
| `image` | `image` | Static image display |
| `compound` | `compound` | Image + text positioning |

**Generated code:**

```python
def visit_Label(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Label code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Label")
    
    kwargs = []
    kwargs.append(f'text="{p.get("text", "")}"')
    
    if p.get("textvariable"):
        var_name = self._var_ref(p["textvariable"])
        kwargs.append(f'textvariable={var_name}')
    if p.get("anchor"):
        kwargs.append(f'anchor="{p["anchor"]}"')
    if p.get("wraplength"):
        kwargs.append(f'wraplength={p["wraplength"]}')
    if p.get("justify"):
        kwargs.append(f'justify="{p["justify"]}"')
    if p.get("compound"):
        kwargs.append(f'compound="{p["compound"]}"')
    
    kwargs.extend(self._style_kwargs(style, "Label"))
    
    lines.append(f"self.{name} = tk.Label(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines


def _var_ref(self, name: str) -> str:
    """Get tkinter variable reference from state variable name."""
    sv = self._find_state_variable(name)
    if sv:
        type_map = {"string": "StringVar", "int": "IntVar", "float": "DoubleVar", "bool": "BooleanVar"}
        return f"self.var_{name}"
    return f"self.var_{name}"
```

**Example output:**

```python
# lbl_title: Label
self.lbl_title = tk.Label(
    self.root,
    text="Voltage Monitor",
    fg="#cdd6f4",
    font=("Segoe UI", 20, "bold"),
    anchor="w",
    justify="left",
)
self.lbl_title.place(x=20, y=20, width=300, height=40)

# lbl_voltage_display: Label (bound to state variable)
self.lbl_voltage_display = tk.Label(
    self.root,
    text="0.0000 V",
    textvariable=self.var_voltage,
    bg="#313244",
    fg="#89dceb",
    font=("Consolas", 28, "bold"),
    bd=2,
    highlightbackground="#45475a",
    highlightcolor="#45475a",
    anchor="center",
    justify="center",
)
self.lbl_voltage_display.place(x=180, y=80, width=200, height=50)
```

#### 3.3.3 Entry

**Generated code:**

```python
def visit_Entry(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Entry code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Entry")
    
    kwargs = []
    if p.get("textvariable"):
        kwargs.append(f'textvariable={self._var_ref(p["textvariable"])}')
    if p.get("show"):
        kwargs.append(f'show="{p["show"]}"')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("validate") and p["validate"] != "none":
        kwargs.append(f'validate="{p["validate"]}"')
        if p.get("validatecommand"):
            kwargs.append(f'validatecommand=(self.register(self.{p["validatecommand"]}), "%P")')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("justify"):
        kwargs.append(f'justify="{p["justify"]}"')
    if p.get("exportselection") is not None:
        kwargs.append(f'exportselection={p["exportselection"]}')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    
    kwargs.extend(self._style_kwargs(style, "Entry"))
    
    lines.append(f"self.{name} = tk.Entry(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# ent_voltage_setpoint: Entry
self.ent_voltage_setpoint = tk.Entry(
    self.root,
    textvariable=self.var_setpoint,
    width=10,
    justify="right",
    bg="#313244",
    fg="#cdd6f4",
    font=("Consolas", 12),
)
self.ent_voltage_setpoint.place(x=180, y=320, width=100, height=28)
```

#### 3.3.4 Text

**Generated code:**

```python
def visit_Text(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Text code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Text")
    
    kwargs = []
    if p.get("wrap"):
        kwargs.append(f'wrap="{p["wrap"]}"')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("height"):
        kwargs.append(f'height={p["height"]}')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("padx") is not None:
        kwargs.append(f'padx={p["padx"]}')
    if p.get("pady") is not None:
        kwargs.append(f'pady={p["pady"]}')
    if p.get("undo") is not None:
        kwargs.append(f'undo={p["undo"]}')
    if p.get("tabs"):
        kwargs.append(f'tabs="{p["tabs"]}"')
    if p.get("spacing1") is not None:
        kwargs.append(f'spacing1={p["spacing1"]}')
    if p.get("spacing2") is not None:
        kwargs.append(f'spacing2={p["spacing2"]}')
    if p.get("spacing3") is not None:
        kwargs.append(f'spacing3={p["spacing3"]}')
    if p.get("exportselection") is not None:
        kwargs.append(f'exportselection={p["exportselection"]}')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    if p.get("setgrid") is not None:
        kwargs.append(f'setgrid={p["setgrid"]}')
    
    kwargs.extend(self._style_kwargs(style, "Text"))
    
    lines.append(f"self.{name} = tk.Text(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    # Insert initial content
    if p.get("text"):
        escaped = p["text"].replace('"', '\\"').replace("\n", "\\n")
        lines.append(f'self.{name}.insert("1.0", "{escaped}")')
    
    # Bind to textvariable if specified (manual trace-based sync)
    if p.get("textvariable"):
        var_ref = self._var_ref(p["textvariable"])
        lines.append(f'# Sync with {var_ref} (manual trace-based)')
        lines.append(f'{var_ref}.trace_add("write", lambda *_: self._sync_text_{name}())')
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# txt_log: Text
self.txt_log = tk.Text(
    self.root,
    wrap="word",
    height=10,
    width=50,
    bg="#181825",
    fg="#cdd6f4",
    font=("Consolas", 10),
    state="disabled",
    undo=False,
)
self.txt_log.place(x=420, y=20, width=360, height=260)
```

#### 3.3.5 Frame

**Generated code:**

```python
def visit_Frame(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Frame code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Frame")
    
    kwargs = []
    if p.get("relief"):
        kwargs.append(f'relief="{p["relief"]}"')
    if p.get("borderwidth") is not None:
        kwargs.append(f'bd={p["borderwidth"]}')
    if p.get("label"):
        # Use LabelFrame instead of Frame
        kwargs.append(f'text="{p["label"]}"')
        if p.get("labelanchor"):
            kwargs.append(f'labelanchor="{p["labelanchor"]}"')
    if p.get("padding"):
        kwargs.append(f'padx={p["padding"][1]}, pady={p["padding"][0]}')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    if p.get("container") is not None:
        kwargs.append(f'container={p["container"]}')
    
    kwargs.extend(self._style_kwargs(style, "Frame"))
    
    widget_class = "tk.LabelFrame" if p.get("label") else "tk.Frame"
    lines.append(f"self.{name} = {widget_class}(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    
    # Children
    for child in node.get("children", []):
        child_lines = self._visit_widget(child, f"self.{name}")
        lines.extend(child_lines)
    
    lines.append("")
    return lines
```

**Example output:**

```python
# frm_settings: Frame (with label)
self.frm_settings = tk.LabelFrame(
    self.root,
    text="Instrument Settings",
    relief="groove",
    bd=2,
    bg="#313244",
    fg="#cdd6f4",
    font=("Segoe UI", 10, "bold"),
    labelanchor="nw",
    padx=10,
    pady=10,
)
self.frm_settings.place(x=420, y=300, width=360, height=200)

# Child widgets inside the frame...
self.lbl_resource = tk.Label(self.frm_settings, ...)
self.lbl_resource.grid(row=0, column=0, ...)
```

#### 3.3.6 Canvas

**Generated code:**

```python
def visit_Canvas(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Canvas code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Canvas")
    
    kwargs = []
    if p.get("scrollregion"):
        r = p["scrollregion"]
        kwargs.append(f'scrollregion=({r[0]}, {r[1]}, {r[2]}, {r[3]})')
    if p.get("confine") is not None:
        kwargs.append(f'confine={p["confine"]}')
    if p.get("closeenough") is not None:
        kwargs.append(f'closeenough={p["closeenough"]}')
    if p.get("selectbackground"):
        kwargs.append(f'selectbackground="{p["selectbackground"]}"')
    if p.get("selectforeground"):
        kwargs.append(f'selectforeground="{p["selectforeground"]}"')
    if p.get("selectborderwidth") is not None:
        kwargs.append(f'selectborderwidth={p["selectborderwidth"]}')
    if p.get("insertbackground"):
        kwargs.append(f'insertbackground="{p["insertbackground"]}"')
    if p.get("insertwidth") is not None:
        kwargs.append(f'insertwidth={p["insertwidth"]}')
    if p.get("insertontime") is not None:
        kwargs.append(f'insertontime={p["insertontime"]}')
    if p.get("insertofftime") is not None:
        kwargs.append(f'insertofftime={p["insertofftime"]}')
    
    kwargs.extend(self._style_kwargs(style, "Canvas"))
    
    lines.append(f"self.{name} = tk.Canvas(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# cnv_plot: Canvas
self.cnv_plot = tk.Canvas(
    self.root,
    scrollregion=(0, 0, 800, 600),
    confine=True,
    closeenough=2.0,
    bg="#181825",
    highlightbackground="#45475a",
)
self.cnv_plot.place(x=20, y=320, width=380, height=200)
```

#### 3.3.7 Listbox

**Generated code:**

```python
def visit_Listbox(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Listbox code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Listbox")
    
    kwargs = []
    if p.get("selectmode") and p["selectmode"] != "browse":
        kwargs.append(f'selectmode="{p["selectmode"]}"')
    if p.get("height"):
        kwargs.append(f'height={p["height"]}')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("listvariable"):
        kwargs.append(f'listvariable={self._var_ref(p["listvariable"])}')
    if p.get("activestyle") and p["activestyle"] != "underline":
        kwargs.append(f'activestyle="{p["activestyle"]}"')
    if p.get("exportselection") is not None:
        kwargs.append(f'exportselection={p["exportselection"]}')
    if p.get("selectbackground"):
        kwargs.append(f'selectbackground="{p["selectbackground"]}"')
    if p.get("selectforeground"):
        kwargs.append(f'selectforeground="{p["selectforeground"]}"')
    if p.get("selectborderwidth") is not None:
        kwargs.append(f'selectborderwidth={p["selectborderwidth"]}')
    if p.get("setgrid") is not None:
        kwargs.append(f'setgrid={p["setgrid"]}')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    
    kwargs.extend(self._style_kwargs(style, "Listbox"))
    
    lines.append(f"self.{name} = tk.Listbox(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    # Insert initial values
    if p.get("values"):
        for i, val in enumerate(p["values"]):
            escaped = val.replace('"', '\\"')
            lines.append(f'self.{name}.insert({i}, "{escaped}")')
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# lbx_channels: Listbox
self.lbx_channels = tk.Listbox(
    self.root,
    selectmode="extended",
    height=6,
    width=20,
    bg="#313244",
    fg="#cdd6f4",
    font=("Consolas", 11),
    selectbackground="#89b4fa",
    selectforeground="#1e1e2e",
)
self.lbx_channels.insert(0, "Channel 1")
self.lbx_channels.insert(1, "Channel 2")
self.lbx_channels.insert(2, "Channel 3")
self.lbx_channels.insert(3, "Channel 4")
self.lbx_channels.place(x=420, y=520, width=180, height=120)
```

#### 3.3.8 Scale

**Generated code:**

```python
def visit_Scale(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Scale code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Scale")
    
    kwargs = []
    if p.get("orient"):
        kwargs.append(f'orient="{p["orient"]}"')
    if p.get("from_") is not None:
        kwargs.append(f'from_={p["from_"]}')
    if p.get("to") is not None:
        kwargs.append(f'to={p["to"]}')
    if p.get("resolution") is not None:
        kwargs.append(f'resolution={p["resolution"]}')
    if p.get("tickinterval") is not None:
        kwargs.append(f'tickinterval={p["tickinterval"]}')
    if p.get("variable"):
        kwargs.append(f'variable={self._var_ref(p["variable"])}')
    if p.get("digits") is not None:
        kwargs.append(f'digits={p["digits"]}')
    if p.get("showvalue") is not None:
        kwargs.append(f'showvalue={p["showvalue"]}')
    if p.get("sliderlength") is not None:
        kwargs.append(f'sliderlength={p["sliderlength"]}')
    if p.get("sliderrelief"):
        kwargs.append(f'sliderrelief="{p["sliderrelief"]}"')
    if p.get("length") is not None:
        kwargs.append(f'length={p["length"]}')
    if p.get("width") is not None:
        kwargs.append(f'width={p["width"]}')
    if p.get("troughcolor"):
        kwargs.append(f'troughcolor="{p["troughcolor"]}"')
    if p.get("command"):
        kwargs.append(f'command=self.{p["command"]}')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    
    kwargs.extend(self._style_kwargs(style, "Scale"))
    
    lines.append(f"self.{name} = tk.Scale(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# scl_sample_rate: Scale
self.scl_sample_rate = tk.Scale(
    self.root,
    orient="horizontal",
    from_=1,
    to=100,
    resolution=1,
    tickinterval=20,
    variable=self.var_sample_rate,
    digits=0,
    showvalue=True,
    sliderlength=20,
    length=300,
    width=15,
    troughcolor="#45475a",
    bg="#1e1e2e",
    fg="#cdd6f4",
    font=("Segoe UI", 10),
)
self.scl_sample_rate.place(x=50, y=450, width=320, height=60)
```

#### 3.3.9 Checkbutton

**Generated code:**

```python
def visit_Checkbutton(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Checkbutton code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Checkbutton")
    
    kwargs = []
    kwargs.append(f'text="{p.get("text", "")}"')
    
    if p.get("variable"):
        kwargs.append(f'variable={self._var_ref(p["variable"])}')
    if p.get("onvalue") is not None:
        kwargs.append(f'onvalue={json.dumps(p["onvalue"])}')
    if p.get("offvalue") is not None:
        kwargs.append(f'offvalue={json.dumps(p["offvalue"])}')
    if p.get("indicatoron") is not None:
        kwargs.append(f'indicatoron={p["indicatoron"]}')
    if p.get("command"):
        kwargs.append(f'command=self.{p["command"]}')
    if p.get("selectcolor"):
        kwargs.append(f'selectcolor="{p["selectcolor"]}"')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("height"):
        kwargs.append(f'height={p["height"]}')
    if p.get("anchor"):
        kwargs.append(f'anchor="{p["anchor"]}"')
    if p.get("justify"):
        kwargs.append(f'justify="{p["justify"]}"')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    
    kwargs.extend(self._style_kwargs(style, "Checkbutton"))
    
    lines.append(f"self.{name} = tk.Checkbutton(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# chk_continuous: Checkbutton
self.chk_continuous = tk.Checkbutton(
    self.root,
    text="Continuous Mode",
    variable=self.var_running,
    onvalue=True,
    offvalue=False,
    indicatoron=True,
    command=self.on_continuous_toggle,
    selectcolor="#89b4fa",
    fg="#cdd6f4",
    font=("Segoe UI", 11),
    bg="#1e1e2e",
)
self.chk_continuous.place(x=50, y=260, width=200, height=28)
```

#### 3.3.10 Radiobutton

**Generated code:**

```python
def visit_Radiobutton(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Radiobutton code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Radiobutton")
    
    kwargs = []
    kwargs.append(f'text="{p.get("text", "")}"')
    
    if p.get("variable"):
        kwargs.append(f'variable={self._var_ref(p["variable"])}')
    if p.get("value") is not None:
        kwargs.append(f'value={json.dumps(p["value"])}')
    if p.get("indicatoron") is not None:
        kwargs.append(f'indicatoron={p["indicatoron"]}')
    if p.get("command"):
        kwargs.append(f'command=self.{p["command"]}')
    if p.get("selectcolor"):
        kwargs.append(f'selectcolor="{p["selectcolor"]}"')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("height"):
        kwargs.append(f'height={p["height"]}')
    if p.get("anchor"):
        kwargs.append(f'anchor="{p["anchor"]}"')
    if p.get("justify"):
        kwargs.append(f'justify="{p["justify"]}"')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    
    kwargs.extend(self._style_kwargs(style, "Radiobutton"))
    
    lines.append(f"self.{name} = tk.Radiobutton(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# rdb_mode_ac: Radiobutton
self.rdb_mode_ac = tk.Radiobutton(
    self.root,
    text="AC",
    variable=self.var_mode,
    value="AC",
    indicatoron=True,
    command=self.on_mode_change,
    selectcolor="#89b4fa",
    fg="#cdd6f4",
    font=("Segoe UI", 11),
    bg="#1e1e2e",
)
self.rdb_mode_ac.place(x=50, y=540, width=60, height=28)

# rdb_mode_dc: Radiobutton
self.rdb_mode_dc = tk.Radiobutton(
    self.root,
    text="DC",
    variable=self.var_mode,
    value="DC",
    indicatoron=True,
    command=self.on_mode_change,
    selectcolor="#89b4fa",
    fg="#cdd6f4",
    font=("Segoe UI", 11),
    bg="#1e1e2e",
)
self.rdb_mode_dc.place(x=120, y=540, width=60, height=28)
```

#### 3.3.11 Combobox

**Generated code:**

```python
def visit_Combobox(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate ttk.Combobox code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    self.uses_ttk = True
    
    lines = []
    lines.append(f"# {name}: Combobox")
    
    kwargs = []
    if p.get("values"):
        vals = json.dumps(p["values"])
        kwargs.append(f'values={vals}')
    if p.get("textvariable"):
        kwargs.append(f'textvariable={self._var_ref(p["textvariable"])}')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("height"):
        kwargs.append(f'height={p["height"]}')
    if p.get("exportselection") is not None:
        kwargs.append(f'exportselection={p["exportselection"]}')
    if p.get("justify"):
        kwargs.append(f'justify="{p["justify"]}"')
    if p.get("postcommand"):
        kwargs.append(f'postcommand=self.{p["postcommand"]}')
    if p.get("validate") and p["validate"] != "none":
        kwargs.append(f'validate="{p["validate"]}"')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    
    kwargs.extend(self._style_kwargs(style, "Combobox"))
    
    lines.append(f"self.{name} = ttk.Combobox(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    # Set current selection if textvariable has default
    if p.get("textvariable"):
        sv = self._find_state_variable(p["textvariable"])
        if sv and sv.get("default"):
            lines.append(f'self.{name}.set("{sv["default"]}")')
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# cmb_range: Combobox
self.cmb_range = ttk.Combobox(
    self.root,
    values=["Auto", "200 mV", "2 V", "20 V", "200 V", "1000 V"],
    textvariable=self.var_range,
    state="readonly",
    width=12,
    justify="left",
)
self.cmb_range.place(x=180, y=380, width=120, height=28)
```

#### 3.3.12 Spinbox

**Generated code:**

```python
def visit_Spinbox(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate tk.Spinbox code."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    
    lines = []
    lines.append(f"# {name}: Spinbox")
    
    kwargs = []
    # Values list takes precedence over from_/to
    if p.get("values"):
        vals = json.dumps(p["values"])
        kwargs.append(f'values={vals}')
    else:
        if p.get("from_") is not None:
            kwargs.append(f'from_={p["from_"]}')
        if p.get("to") is not None:
            kwargs.append(f'to={p["to"]}')
    if p.get("increment") is not None:
        kwargs.append(f'increment={p["increment"]}')
    if p.get("textvariable"):
        kwargs.append(f'textvariable={self._var_ref(p["textvariable"])}')
    if p.get("wrap") is not None:
        kwargs.append(f'wrap={p["wrap"]}')
    if p.get("width"):
        kwargs.append(f'width={p["width"]}')
    if p.get("format"):
        kwargs.append(f'format="{p["format"]}"')
    if p.get("command"):
        kwargs.append(f'command=self.{p["command"]}')
    if p.get("state"):
        kwargs.append(f'state="{p["state"]}"')
    if p.get("justify"):
        kwargs.append(f'justify="{p["justify"]}"')
    if p.get("exportselection") is not None:
        kwargs.append(f'exportselection={p["exportselection"]}')
    if p.get("takefocus") is not None:
        kwargs.append(f'takefocus={p["takefocus"]}')
    if p.get("repeatdelay") is not None:
        kwargs.append(f'repeatdelay={p["repeatdelay"]}')
    if p.get("repeatinterval") is not None:
        kwargs.append(f'repeatinterval={p["repeatinterval"]}')
    
    kwargs.extend(self._style_kwargs(style, "Spinbox"))
    
    lines.append(f"self.{name} = tk.Spinbox(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    lines.extend(self._emit_layout(node, name, parent_var))
    lines.append("")
    return lines
```

**Example output:**

```python
# spb_avg_count: Spinbox
self.spb_avg_count = tk.Spinbox(
    self.root,
    from_=1,
    to=100,
    increment=1,
    textvariable=self.var_avg_count,
    wrap=True,
    width=6,
    format="%02.0f",
    justify="right",
    bg="#313244",
    fg="#cdd6f4",
    font=("Consolas", 12),
)
self.spb_avg_count.place(x=320, y=380, width=60, height=28)
```

#### 3.3.13 GridContainer

**Generated code:**

```python
def visit_GridContainer(self, node: Dict, parent_var: str = "self.root") -> List[str]:
    """Generate GridContainer (LabelFrame with grid layout)."""
    name = node["name"]
    p = node.get("widget_props", {})
    style = node.get("style", {})
    geo = node.get("geometry", {})
    
    lines = []
    lines.append(f"# {name}: GridContainer ({p.get('rows', 1)}x{p.get('columns', 1)})")
    
    kwargs = []
    if p.get("label"):
        kwargs.append(f'text="{p["label"]}"')
    if p.get("relief"):
        kwargs.append(f'relief="{p["relief"]}"')
    if p.get("borderwidth") is not None:
        kwargs.append(f'bd={p["borderwidth"]}')
    if p.get("padding"):
        kwargs.append(f'padx={p["padding"][1]}, pady={p["padding"][0]}')
    
    kwargs.extend(self._style_kwargs(style, "GridContainer"))
    
    lines.append(f"self.{name} = tk.LabelFrame(")
    lines.append(f"    {parent_var},")
    for kw in kwargs:
        lines.append(f"    {kw},")
    lines.append(")")
    
    # Absolute placement for the container itself
    lines.append(
        f"self.{name}.place("
        f'x={geo["x"]}, y={geo["y"]}, '
        f'width={geo["w"]}, height={geo["h"]})'
    )
    
    # Configure row weights
    for rw in p.get("row_weights", []):
        kw_parts = [f'weight={rw["weight"]}']
        if rw.get("minsize") is not None:
            kw_parts.append(f'minsize={rw["minsize"]}')
        if rw.get("pad") is not None:
            kw_parts.append(f'pad={rw["pad"]}')
        kw_str = ", ".join(kw_parts)
        lines.append(f'self.{name}.grid_rowconfigure({rw["index"]}, {kw_str})')
    
    # Configure column weights
    for cw in p.get("col_weights", []):
        kw_parts = [f'weight={cw["weight"]}']
        if cw.get("minsize") is not None:
            kw_parts.append(f'minsize={cw["minsize"]}')
        if cw.get("pad") is not None:
            kw_parts.append(f'pad={cw["pad"]}')
        kw_str = ", ".join(kw_parts)
        lines.append(f'self.{name}.grid_columnconfigure({cw["index"]}, {kw_str})')
    
    # Children use grid layout
    sticky_default = p.get("sticky_default", "")
    for i, child in enumerate(node.get("children", [])):
        row = i // p.get("columns", 1)
        col = i % p.get("columns", 1)
        child_lines = self._visit_widget(
            child,
            f"self.{name}",
            layout="grid",
            grid_pos={"row": row, "column": col, "sticky": sticky_default},
        )
        lines.extend(child_lines)
    
    lines.append("")
    return lines
```

**Example output:**

```python
# frm_form: GridContainer (3x2)
self.frm_form = tk.LabelFrame(
    self.root,
    text="Instrument Settings",
    relief="groove",
    bd=2,
    bg="#313244",
    fg="#cdd6f4",
    font=("Segoe UI", 10, "bold"),
    padx=10,
    pady=10,
)
self.frm_form.place(x=420, y=300, width=360, height=200)

self.frm_form.grid_rowconfigure(0, weight=0)
self.frm_form.grid_rowconfigure(1, weight=0)
self.frm_form.grid_rowconfigure(2, weight=0)
self.frm_form.grid_columnconfigure(0, weight=0)
self.frm_form.grid_columnconfigure(1, weight=1)

# Child widgets use grid layout
self.lbl_resource = tk.Label(self.frm_form, text="Resource:", fg="#cdd6f4", font=("Segoe UI", 10))
self.lbl_resource.grid(row=0, column=0, sticky="w", padx=5, pady=2)

self.ent_resource = tk.Entry(self.frm_form, textvariable=self.var_resource, font=("Consolas", 10))
self.ent_resource.grid(row=0, column=1, sticky="ew", padx=5, pady=2)

self.lbl_baud = tk.Label(self.frm_form, text="Baudrate:", fg="#cdd6f4", font=("Segoe UI", 10))
self.lbl_baud.grid(row=1, column=0, sticky="w", padx=5, pady=2)

self.cmb_baud = ttk.Combobox(self.frm_form, values=[9600, 19200, 38400, 57600, 115200], state="readonly", width=10)
self.cmb_baud.grid(row=1, column=1, sticky="w", padx=5, pady=2)

self.lbl_timeout = tk.Label(self.frm_form, text="Timeout (s):", fg="#cdd6f4", font=("Segoe UI", 10))
self.lbl_timeout.grid(row=2, column=0, sticky="w", padx=5, pady=2)

self.spn_timeout = tk.Spinbox(self.frm_form, from_=1, to=60, increment=1, width=6, justify="right")
self.spn_timeout.grid(row=2, column=1, sticky="w", padx=5, pady=2)
```

---

### 3.4 Layout Method Dispatch

The generator chooses between `place()` and `grid()` based on the widget's parent context:

```python
def _emit_layout(self, node: Dict, widget_name: str, parent_var: str,
                 layout: str = "auto", grid_pos: Optional[Dict] = None) -> List[str]:
    """Emit layout code (place or grid) for a widget."""
    lines = []
    name = widget_name
    
    if layout == "grid" or (layout == "auto" and self._is_inside_grid_container(node)):
        # Use grid layout
        geo = node.get("geometry", {})
        if grid_pos:
            row = grid_pos["row"]
            col = grid_pos["column"]
            sticky = grid_pos.get("sticky", "")
        else:
            # Infer from geometry relative to parent
            row = 0
            col = 0
            sticky = ""
        
        grid_kwargs = [f'row={row}', f'column={col}']
        if sticky:
            grid_kwargs.append(f'sticky="{sticky}"')
        # Add padding from style if available
        style = node.get("style", {})
        if style.get("padding"):
            grid_kwargs.append(f'padx={style["padding"][1]}, pady={style["padding"][0]}')
        
        grid_str = ", ".join(grid_kwargs)
        lines.append(f'self.{name}.grid({grid_str})')
    else:
        # Use absolute place layout
        geo = node.get("geometry", {})
        lines.append(
            f'self.{name}.place('
            f'x={geo.get("x", 0)}, y={geo.get("y", 0)}, '
            f'width={geo.get("w", 100)}, height={geo.get("h", 30)})'
        )
    
    return lines


def _is_inside_grid_container(self, node: Dict) -> bool:
    """Check if a widget's parent is a GridContainer."""
    parent_id = node.get("parent")
    if not parent_id:
        return False
    parent = self.widgets_by_id.get(parent_id)
    return parent is not None and parent.get("type") == "GridContainer"
```

---

### 3.5 State Variable Code Generation

```python
def _emit_state_variables(self, code: CodeBlock):
    """Generate the _init_state_variables method."""
    code.add("def _init_state_variables(self):")
    code.add('    """Initialize tkinter variable bindings."""')
    code.add('    """')
    
    for sv in self.project.get("state_variables", []):
        var_name = f"self.var_{sv['name']}"
        default = sv.get("default")
        type_ = sv["type"]
        
        if type_ == "string":
            code.add(f'{var_name} = tk.StringVar(value="{default}")')
        elif type_ == "int":
            code.add(f'{var_name} = tk.IntVar(value={default})')
        elif type_ == "float":
            code.add(f'{var_name} = tk.DoubleVar(value={default})')
        elif type_ == "bool":
            code.add(f'{var_name} = tk.BooleanVar(value={default})')
    
    # Add trace callbacks if specified in theme or widgets
    for sv in self.project.get("state_variables", []):
        # Traces for alarms that monitor this variable
        alarms_for_var = [
            a for a in self.project.get("alarms", [])
            if a.get("source") == sv["name"] and a.get("enabled")
        ]
        if alarms_for_var:
            var_name = f"self.var_{sv['name']}"
            code.add(f'{var_name}.trace_add("write", self._check_alarms_{sv["name"]})')
    
    code.add("")
```

**Generated output:**

```python
def _init_state_variables(self):
    """Initialize tkinter variable bindings."""
    self.var_voltage = tk.DoubleVar(value=0.0)
    self.var_running = tk.BooleanVar(value=False)
    self.var_voltage.trace_add("write", self._check_alarms_voltage)
```

---

### 3.6 Instrument Code Generation

#### 3.6.1 VISA Instruments

```python
def _emit_instruments(self, code: CodeBlock):
    """Generate instrument initialization code."""
    instruments = self.project.get("instruments", [])
    if not instruments:
        return
    
    code.add("def _init_instruments(self):")
    code.add('    """Initialize instrument connections."""')
    code.add('    """')
    
    for inst in instruments:
        if not inst.get("enabled", True):
            code.add(f'    # Instrument "{inst["name"]}" is disabled')
            continue
        
        name = inst["name"]
        protocol = inst["protocol"]
        config = inst.get("config", {})
        
        if protocol == "visa":
            self.uses_pyvisa = True
            code.add('    import pyvisa')
            code.add(f'    self.rm_{name} = pyvisa.ResourceManager("{config.get("backend", "")}")')
            code.add(f'    self.instr_{name} = self.rm_{name}.open_resource("{config["resource_string"]}")')
            if config.get("timeout"):
                code.add(f'    self.instr_{name}.timeout = {int(config["timeout"] * 1000)}')
        
        elif protocol == "serial":
            self.uses_serial = True
            code.add('    import serial')
            code.add(f'    self.ser_{name} = serial.Serial(')
            code.add(f'        port="{config.get("port", "")}",')
            code.add(f'        baudrate={config.get("baudrate", 9600)},')
            code.add(f'        bytesize={config.get("bytesize", 8)},')
            code.add(f'        parity="{config.get("parity", "N")}",')
            code.add(f'        stopbits={config.get("stopbits", 1)},')
            code.add(f'        timeout={config.get("timeout", 5.0)},')
            if config.get("rtscts"):
                code.add(f'        rtscts={config["rtscts"]},')
            if config.get("dsrdtr"):
                code.add(f'        dsrdtr={config["dsrdtr"]},')
            if config.get("xonxoff"):
                code.add(f'        xonxoff={config["xonxoff"]},')
            code.add('    )')
        
        elif protocol == "tcp":
            code.add('    import socket')
            code.add(f'    self.sock_{name} = socket.socket(socket.AF_INET, socket.SOCK_STREAM)')
            code.add(f'    self.sock_{name}.settimeout({config.get("connect_timeout", 5.0)})')
            code.add(f'    self.sock_{name}.connect(("{config.get("host", "")}", {config.get("tcp_port", 0)}))')
    
    code.add("")
```

**Generated output (VISA):**

```python
def _init_instruments(self):
    """Initialize instrument connections."""
    import pyvisa
    self.rm_multimeter = pyvisa.ResourceManager("pyvisa")
    self.instr_multimeter = self.rm_multimeter.open_resource("GPIB0::22::INSTR")
    self.instr_multimeter.timeout = 5000
```

#### 3.6.2 Instrument Query Methods

```python
def _emit_instrument_methods(self, code: CodeBlock):
    """Generate instrument query/execute methods."""
    for inst in self.project.get("instruments", []):
        if not inst.get("enabled", True):
            continue
        
        name = inst["name"]
        protocol = inst["protocol"]
        
        for cmd in inst.get("commands", []):
            cmd_name = cmd["name"]
            code.add(f'def _instr_{name}_{cmd_name}(self):')
            code.add(f'    """{cmd.get("display_name", cmd_name)}."""')
            code.add('    """')
            
            send = cmd["send"].replace("\n", "\\n").replace("\r", "\\r")
            
            if protocol == "visa":
                code.add('    try:')
                code.add(f'        self.instr_{name}.write("{send}")')
                if cmd.get("parse_type") != "none":
                    code.add(f'        response = self.instr_{name}.read()')
                    self._emit_parse_code(code, cmd, "response")
                code.add('    except Exception as e:')
                code.add(f'        print(f"Instrument error ({cmd_name}): {{e}}")')
            
            elif protocol == "serial":
                code.add('    try:')
                code.add(f'        self.ser_{name}.write(b"{send}")')
                if cmd.get("parse_type") != "none":
                    code.add(f'        response = self.ser_{name}.readline().decode("utf-8", errors="replace")')
                    self._emit_parse_code(code, cmd, "response")
                code.add('    except Exception as e:')
                code.add(f'        print(f"Serial error ({cmd_name}): {{e}}")')
            
            elif protocol == "tcp":
                code.add('    try:')
                code.add(f'        self.sock_{name}.sendall(b"{send}")')
                if cmd.get("parse_type") != "none":
                    code.add(f'        response = self.sock_{name}.recv(4096).decode("utf-8", errors="replace")')
                    self._emit_parse_code(code, cmd, "response")
                code.add('    except Exception as e:')
                code.add(f'        print(f"TCP error ({cmd_name}): {{e}}")')
            
            code.add("")
```

**Parse code generation:**

```python
def _emit_parse_code(self, code: CodeBlock, cmd: Dict, response_var: str):
    """Generate value parsing code based on parse_type."""
    parse_type = cmd.get("parse_type", "string")
    
    if parse_type == "float":
        code.add(f'        value = float({response_var}.strip())')
    elif parse_type == "int":
        code.add(f'        value = int({response_var}.strip())')
    elif parse_type == "string":
        code.add(f'        value = {response_var}.strip()')
    elif parse_type == "bytes":
        code.add(f'        value = {response_var}')
    elif parse_type == "regex":
        code.add('        import re')
        code.add(f'        match = re.search(r"{cmd.get("parse_pattern", ".*")}", {response_var})')
        code.add('        value = match.group(1) if match else None')
    elif parse_type == "json":
        code.add('        import json')
        code.add(f'        data = json.loads({response_var})')
        if cmd.get("parse_json_path"):
            code.add(f'        value = data.get("{cmd["parse_json_path"]}")')
        else:
            code.add('        value = data')
    
    # Apply transform if specified
    if cmd.get("transform"):
        code.add(f'        value = {cmd["transform"].replace("value", "value")}')
    
    # Update bound state variable or widget
    bindings = self._find_bindings_for_command(cmd["id"])
    for binding in bindings:
        if binding.get("target_type") == "state":
            var_name = f"self.var_{binding['target_id']}"
            code.add(f'        # Thread-safe update to tkinter')
            code.add(f'        self.root.after(0, lambda v=value: {var_name}.set(v))')
        elif binding.get("target_type") == "widget":
            widget = self.widgets_by_id.get(binding["target_id"])
            if widget:
                wname = widget["name"]
                prop = binding.get("target_property", "text")
                code.add(f'        # Thread-safe update to widget')
                code.add(f'        self.root.after(0, lambda v=value: self.{wname}.config({prop}=v))')
```

**Generated output:**

```python
def _instr_multimeter_read_voltage(self):
    """Read DC Voltage."""
    try:
        self.instr_multimeter.write("MEAS:VOLT:DC?\n")
        response = self.instr_multimeter.read()
        value = float(response.strip())
        value = float(value) * 1.0
        # Thread-safe update to tkinter
        self.root.after(0, lambda v=value: self.var_voltage.set(v))
    except Exception as e:
        print(f"Instrument error (read_voltage): {e}")


def _instr_multimeter_read_idn(self):
    """Identify."""
    try:
        self.instr_multimeter.write("*IDN?\n")
        response = self.instr_multimeter.read()
        value = response.strip()
    except Exception as e:
        print(f"Instrument error (read_idn): {e}")
```

---

### 3.7 Data Logger Code Generation

```python
def _emit_data_loggers(self, code: CodeBlock):
    """Generate data logger initialization and loop methods."""
    loggers = self.project.get("data_loggers", [])
    if not loggers:
        return
    
    self.uses_threading = True
    self.uses_csv = True
    self.uses_datetime = True
    
    code.add("def _init_data_loggers(self):")
    code.add('    """Initialize data logging threads."""')
    code.add('    """')
    
    for logger in loggers:
        if not logger.get("enabled", True):
            code.add(f'    # Logger "{logger["name"]}" is disabled')
            continue
        
        name = logger["name"]
        code.add(f'    self._logger_{name}_running = True')
        code.add(f'    self._logger_{name}_thread = threading.Thread(')
        code.add(f'        target=self._logger_{name}_loop,')
        code.add('        daemon=True,')
        code.add('    )')
        code.add(f'    self._logger_{name}_thread.start()')
    
    code.add("")
    
    # Logger loop methods
    for logger in loggers:
        if not logger.get("enabled", True):
            continue
        
        name = logger["name"]
        interval_s = logger["interval_ms"] / 1000.0
        file_path = logger["file_path"]
        timestamp_fmt = logger.get("timestamp_format", "iso")
        
        code.add(f'def _logger_{name}_loop(self):')
        code.add(f'    """Data logger loop for {name}."""')
        code.add('    """')
        
        # Handle path placeholders
        if "{date}" in file_path or "{time}" in file_path:
            code.add(f'    file_path = self._resolve_log_path("{file_path}")')
        else:
            code.add(f'    file_path = "{file_path}"')
        
        # Ensure directory exists
        code.add('    import os')
        code.add('    os.makedirs(os.path.dirname(file_path), exist_ok=True)')
        
        # Write header if needed
        if logger.get("header_style") == "once":
            code.add('    # Write CSV header')
            code.add('    import os as _os')
            code.add('    if not _os.path.exists(file_path) or _os.path.getsize(file_path) == 0:')
            headers = ['"timestamp"'] if logger.get("include_timestamp") else []
            headers.extend(f'"{s}"' for s in logger["sources"])
            code.add(f'        with open(file_path, "w", newline="") as _f:')
            code.add(f'            _f.write(",".join([{", ".join(headers)}]) + "\\n")')
        
        code.add(f'    while self._logger_{name}_running:')
        code.add('        try:')
        
        # Collect values
        values = []
        if logger.get("include_timestamp"):
            if timestamp_fmt == "iso":
                values.append('datetime.now().isoformat()')
            elif timestamp_fmt == "unix_ms":
                values.append('int(time.time() * 1000)')
            elif timestamp_fmt == "unix_s":
                values.append('int(time.time())')
            elif timestamp_fmt == "elapsed_ms":
                values.append('int((time.time() - self._start_time) * 1000)')
        
        for src in logger["sources"]:
            values.append(f'self.var_{src}.get()')
        
        code.add(f'            row = [{", ".join(values)}]')
        code.add('            with open(file_path, "a", newline="") as f:')
        code.add('                writer = csv.writer(f)')
        code.add('                writer.writerow(row)')
        code.add('        except Exception as e:')
        code.add(f'            print(f"Logger error ({name}): {{e}}")')
        code.add(f'        time.sleep({interval_s})')
        code.add("")
```

**Generated output:**

```python
def _init_data_loggers(self):
    """Initialize data logging threads."""
    self._logger_voltage_logger_running = True
    self._logger_voltage_logger_thread = threading.Thread(
        target=self._logger_voltage_logger_loop,
        daemon=True,
    )
    self._logger_voltage_logger_thread.start()

def _logger_voltage_logger_loop(self):
    """Data logger loop for voltage_logger."""
    file_path = "./logs/voltage_{date}.csv"
    import os
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    # Write CSV header
    import os as _os
    if not _os.path.exists(file_path) or _os.path.getsize(file_path) == 0:
        with open(file_path, "w", newline="") as _f:
            _f.write(",".join(["timestamp", "voltage"]) + "\n")
    while self._logger_voltage_logger_running:
        try:
            row = [datetime.now().isoformat(), self.var_voltage.get()]
            with open(file_path, "a", newline="") as f:
                writer = csv.writer(f)
                writer.writerow(row)
        except Exception as e:
            print(f"Logger error (voltage_logger): {e}")
        time.sleep(1.0)
```

---

### 3.8 Alarm Code Generation

```python
def _emit_alarms(self, code: CodeBlock):
    """Generate alarm initialization and monitoring loop."""
    alarms = self.project.get("alarms", [])
    if not alarms:
        return
    
    self.uses_threading = True
    
    code.add("def _init_alarms(self):")
    code.add('    """Initialize alarm monitoring threads."""')
    code.add('    """')
    
    for alarm in alarms:
        if not alarm.get("enabled", True):
            code.add(f'    # Alarm "{alarm["name"]}" is disabled')
            continue
        
        name = alarm["name"]
        code.add(f'    self._alarm_{name}_running = True')
        code.add(f'    self._alarm_{name}_thread = threading.Thread(')
        code.add(f'        target=self._alarm_{name}_loop,')
        code.add('        daemon=True,')
        code.add('    )')
        code.add(f'    self._alarm_{name}_thread.start()')
    
    code.add("")
    
    # Alarm loop methods
    for alarm in alarms:
        if not alarm.get("enabled", True):
            continue
        
        name = alarm["name"]
        source = alarm["source"]
        condition = alarm["condition"]
        threshold = alarm["threshold"]
        severity = alarm.get("severity", "warning")
        debounce_s = (alarm.get("debounce_ms", 0) or 0) / 1000.0
        cooldown_s = (alarm.get("cooldown_ms", 0) or 0) / 1000.0
        
        code.add(f'def _alarm_{name}_loop(self):')
        code.add(f'    """Alarm monitoring loop for {name}."""')
        code.add('    """')
        code.add(f'    _last_trigger = 0')
        code.add(f'    while self._alarm_{name}_running:')
        code.add('        try:')
        code.add(f'            value = self.var_{source}.get()')
        
        # Condition check
        self._emit_condition_check(code, condition, threshold)
        
        code.add('            if _triggered:')
        if debounce_s > 0:
            code.add(f'                time.sleep({debounce_s})')
            code.add(f'                value = self.var_{source}.get()')
            self._emit_condition_check(code, condition, threshold)
            code.add('                if not _triggered:')
            code.add('                    continue')
        if cooldown_s > 0:
            code.add(f'                if time.time() - _last_trigger < {cooldown_s}:')
            code.add('                    continue')
            code.add('                _last_trigger = time.time()')
        
        # Execute actions
        for action in alarm.get("actions", []):
            if not action.get("enabled", True):
                continue
            self._emit_alarm_action(code, action, source, threshold)
        
        # Auto-acknowledge
        if alarm.get("auto_acknowledge"):
            code.add('            else:')
            code.add('                # Condition cleared — reset visual state')
            for action in alarm.get("actions", []):
                if action.get("type") == "visual" and action.get("target_widget"):
                    w = self.widgets_by_id.get(action["target_widget"])
                    if w:
                        style = w.get("style", {})
                        orig_fg = style.get("fg", "#000000")
                        code.add(f'                self.{w["name"]}.config(fg="{orig_fg}")')
        
        code.add('        except Exception as e:')
        code.add(f'            print(f"Alarm error ({name}): {{e}}")')
        code.add('        time.sleep(0.5)')
        code.add("")
```

**Condition check generation:**

```python
def _emit_condition_check(self, code: CodeBlock, condition: str, threshold):
    """Emit condition evaluation code."""
    if condition == "gt":
        code.add(f'            _triggered = value > {threshold}')
    elif condition == "lt":
        code.add(f'            _triggered = value < {threshold}')
    elif condition == "gte":
        code.add(f'            _triggered = value >= {threshold}')
    elif condition == "lte":
        code.add(f'            _triggered = value <= {threshold}')
    elif condition == "eq":
        code.add(f'            _triggered = value == {threshold}')
    elif condition == "neq":
        code.add(f'            _triggered = value != {threshold}')
    elif condition == "in_range":
        code.add(f'            _triggered = {threshold[0]} <= value <= {threshold[1]}')
    elif condition == "out_of_range":
        code.add(f'            _triggered = value < {threshold[0]} or value > {threshold[1]}')
    elif condition == "changed":
        code.add(f'            _triggered = value != getattr(self, "_alarm_prev_{condition}", value)')
        code.add(f'            setattr(self, "_alarm_prev_{condition}", value)')
```

**Alarm action generation:**

```python
def _emit_alarm_action(self, code: CodeBlock, action: Dict, source: str, threshold):
    """Emit code for a single alarm action."""
    action_type = action["type"]
    
    if action_type == "visual":
        target = action.get("target_widget", "")
        flash_color = action.get("flash_color", "#ff0000")
        duration = action.get("flash_duration_ms", 500)
        count = action.get("flash_count", 1)
        
        if target:
            code.add(f'                # Visual alert: flash {target}')
            code.add(f'                self.root.after(0, lambda: self.{target}.config(fg="{flash_color}"))')
            if count > 1:
                code.add(f'                for _ in range({count - 1}):')
                code.add(f'                    time.sleep({duration / 1000.0})')
                code.add(f'                    self.root.after(0, lambda: self.{target}.config(fg="{flash_color}"))')
    
    elif action_type == "log":
        log_msg = action.get("log_message", f"ALARM: {{source}}={{value}}")
        log_level = action.get("log_level", "warning")
        log_target = action.get("log_target", "console")
        log_file = action.get("log_file_path", "")
        
        # Substitute placeholders
        msg = log_msg.replace("{value}", '{value}').replace("{threshold}", str(threshold)).replace("{name}", source)
        
        code.add(f'                # Log alert')
        code.add(f'                print(f"{msg}")')
        
        if log_target in ("file", "both") and log_file:
            code.add(f'                with open("{log_file}", "a") as _logf:')
            code.add(f'                    _logf.write(f"{msg}" + "\\n")')
    
    elif action_type == "script":
        script = action.get("script", "")
        if script:
            code.add(f'                # Execute alarm script')
            for line in script.split("\n"):
                code.add(f'                {line}')
```

**Generated output:**

```python
def _init_alarms(self):
    """Initialize alarm monitoring threads."""
    self._alarm_overvoltage_alarm_running = True
    self._alarm_overvoltage_alarm_thread = threading.Thread(
        target=self._alarm_overvoltage_alarm_loop,
        daemon=True,
    )
    self._alarm_overvoltage_alarm_thread.start()

def _alarm_overvoltage_alarm_loop(self):
    """Alarm monitoring loop for overvoltage_alarm."""
    _last_trigger = 0
    while self._alarm_overvoltage_alarm_running:
        try:
            value = self.var_voltage.get()
            _triggered = value > 250.0
            if _triggered:
                if time.time() - _last_trigger < 5.0:
                    continue
                _last_trigger = time.time()
                # Visual alert: flash lbl_voltage_display
                self.root.after(0, lambda: self.lbl_voltage_display.config(fg="#f38ba8"))
                # Log alert
                print(f"ALARM: Voltage {value}V exceeds threshold 250.0V")
                with open("./logs/alarms.log", "a") as _logf:
                    _logf.write(f"ALARM: Voltage {value}V exceeds threshold 250.0V" + "\n")
            else:
                # Condition cleared — reset visual state
                self.lbl_voltage_display.config(fg="#89dceb")
        except Exception as e:
            print(f"Alarm error (overvoltage_alarm): {e}")
        time.sleep(0.5)
```

---

### 3.9 Cleanup Code Generation

```python
def _emit_cleanup(self, code: CodeBlock):
    """Generate resource cleanup method."""
    code.add("def on_closing(self):")
    code.add('    """Clean up resources before application exit."""')
    code.add('    """')
    
    # Stop all logger threads
    for logger in self.project.get("data_loggers", []):
        if logger.get("enabled", True):
            name = logger["name"]
            code.add(f'    self._logger_{name}_running = False')
            code.add(f'    if hasattr(self, "_logger_{name}_thread"):')
            code.add(f'        self._logger_{name}_thread.join(timeout=2.0)')
    
    # Stop all alarm threads
    for alarm in self.project.get("alarms", []):
        if alarm.get("enabled", True):
            name = alarm["name"]
            code.add(f'    self._alarm_{name}_running = False')
            code.add(f'    if hasattr(self, "_alarm_{name}_thread"):')
            code.add(f'        self._alarm_{name}_thread.join(timeout=2.0)')
    
    # Close instruments
    for inst in self.project.get("instruments", []):
        if not inst.get("enabled", True):
            continue
        name = inst["name"]
        protocol = inst["protocol"]
        
        if protocol == "visa":
            code.add(f'    if hasattr(self, "instr_{name}"):')
            code.add(f'        self.instr_{name}.close()')
            code.add(f'    if hasattr(self, "rm_{name}"):')
            code.add(f'        self.rm_{name}.close()')
        elif protocol == "serial":
            code.add(f'    if hasattr(self, "ser_{name}") and self.ser_{name}.is_open:')
            code.add(f'        self.ser_{name}.close()')
        elif protocol == "tcp":
            code.add(f'    if hasattr(self, "sock_{name}"):')
            code.add(f'        self.sock_{name}.close()')
    
    code.add('    self.root.destroy()')
    code.add("")
```

**Generated output:**

```python
def on_closing(self):
    """Clean up resources before application exit."""
    self._logger_voltage_logger_running = False
    if hasattr(self, "_logger_voltage_logger_thread"):
        self._logger_voltage_logger_thread.join(timeout=2.0)
    self._alarm_overvoltage_alarm_running = False
    if hasattr(self, "_alarm_overvoltage_alarm_thread"):
        self._alarm_overvoltage_alarm_thread.join(timeout=2.0)
    if hasattr(self, "instr_multimeter"):
        self.instr_multimeter.close()
    if hasattr(self, "rm_multimeter"):
        self.rm_multimeter.close()
    self.root.destroy()
```

---

### 3.10 Main Block Generation

```python
def _emit_main_block(self, code: CodeBlock):
    """Generate the if __name__ == '__main__' block."""
    code.add('if __name__ == "__main__":')
    code.add('    root = tk.Tk()')
    code.add(f'    app = {self.class_name}(root)')
    code.add('    root.protocol("WM_DELETE_WINDOW", app.on_closing)')
    code.add('    root.mainloop()')
```

---

### 3.11 Header Generation

```python
def _emit_header(self, code: CodeBlock):
    """Generate file header with imports."""
    meta = self.project.get("metadata", {})
    
    code.add('#!/usr/bin/env python3')
    code.add('"""Generated by LabGUI Builder -- do not hand-edit.')
    code.add('')
    code.add(f'Project:    {self.project.get("name", "Untitled")}')
    code.add(f'Version:    {self.project.get("version", "1.0.0")}')
    code.add(f'Created:    {meta.get("created", "")}')
    code.add(f'Author:     {meta.get("author", "")}')
    code.add('"""')
    code.add('')
    code.add('import tkinter as tk')
    
    if self.uses_ttk:
        code.add('from tkinter import ttk')
    if self.uses_tkmessagebox:
        code.add('from tkinter import messagebox')
    if self.uses_threading:
        code.add('import threading')
    if self.uses_csv:
        code.add('import csv')
    if self.uses_datetime:
        code.add('from datetime import datetime')
    
    code.add('import time  # always imported for sleep/intervals')
    code.add('import os')
    
    # Lazy imports for instruments are inside methods
```

---

### 3.12 Complete Generated File Example

Below is the complete generated `.py` file for the "Multimeter Readout" project:

```python
#!/usr/bin/env python3
"""Generated by LabGUI Builder -- do not hand-edit.

Project:    Multimeter Readout
Version:    1.0.0
Created:    2025-01-15T09:30:00Z
Author:     Lab Technician
"""

import tkinter as tk
from tkinter import ttk
import threading
import csv
from datetime import datetime
import time
import os


class MultimeterReadout:
    """Main application class for Multimeter Readout."""

    def __init__(self, root):
        self.root = root
        self.root.title("Multimeter Readout")
        self.root.geometry("800x600")
        self.root.configure(bg="#1e1e2e")

        # --- State Variables ---
        self._init_state_variables()

        # --- Instruments ---
        self._init_instruments()

        # --- Widgets ---
        self._build_ui()

        # --- Data Loggers ---
        self._init_data_loggers()

        # --- Alarms ---
        self._init_alarms()

    def _init_state_variables(self):
        """Initialize tkinter variable bindings."""
        self.var_voltage = tk.DoubleVar(value=0.0)
        self.var_running = tk.BooleanVar(value=False)
        self.var_voltage.trace_add("write", self._check_alarms_voltage)

    def _init_instruments(self):
        """Initialize instrument connections."""
        import pyvisa
        self.rm_multimeter = pyvisa.ResourceManager("pyvisa")
        self.instr_multimeter = self.rm_multimeter.open_resource("GPIB0::22::INSTR")
        self.instr_multimeter.timeout = 5000

    def _build_ui(self):
        """Build all widgets."""
        # lbl_title: Label
        self.lbl_title = tk.Label(
            self.root,
            text="Voltage Monitor",
            fg="#cdd6f4",
            font=("Segoe UI", 20, "bold"),
            anchor="w",
            justify="left",
        )
        self.lbl_title.place(x=20, y=20, width=300, height=40)

        # lbl_voltage_label: Label
        self.lbl_voltage_label = tk.Label(
            self.root,
            text="Voltage:",
            fg="#a6adc8",
            font=("Segoe UI", 14),
            anchor="e",
            justify="right",
        )
        self.lbl_voltage_label.place(x=50, y=90, width=120, height=30)

        # lbl_voltage_display: Label
        self.lbl_voltage_display = tk.Label(
            self.root,
            text="0.0000 V",
            textvariable=self.var_voltage,
            bg="#313244",
            fg="#89dceb",
            font=("Consolas", 28, "bold"),
            bd=2,
            highlightbackground="#45475a",
            highlightcolor="#45475a",
            anchor="center",
            justify="center",
        )
        self.lbl_voltage_display.place(x=180, y=80, width=200, height=50)

        # btn_read: Button
        self.btn_read = tk.Button(
            self.root,
            text="Read",
            command=self.on_btn_read_click,
            relief="flat",
            bg="#89b4fa",
            fg="#1e1e2e",
            font=("Segoe UI", 12, "bold"),
        )
        self.btn_read.place(x=50, y=160, width=120, height=40)

        # btn_stop: Button
        self.btn_stop = tk.Button(
            self.root,
            text="Stop",
            command=self.on_btn_stop_click,
            relief="flat",
            bg="#f38ba8",
            fg="#1e1e2e",
            font=("Segoe UI", 12, "bold"),
        )
        self.btn_stop.place(x=190, y=160, width=120, height=40)

        # lbl_status: Label
        self.lbl_status = tk.Label(
            self.root,
            text="Ready",
            fg="#a6e3a1",
            font=("Segoe UI", 11),
            anchor="w",
            justify="left",
        )
        self.lbl_status.place(x=50, y=220, width=260, height=24)

        # chk_continuous: Checkbutton
        self.chk_continuous = tk.Checkbutton(
            self.root,
            text="Continuous Mode",
            variable=self.var_running,
            onvalue=True,
            offvalue=False,
            indicatoron=True,
            command=self.on_continuous_toggle,
            selectcolor="#89b4fa",
            fg="#cdd6f4",
            font=("Segoe UI", 11),
            bg="#1e1e2e",
        )
        self.chk_continuous.place(x=50, y=260, width=200, height=28)

    def _init_data_loggers(self):
        """Initialize data logging threads."""
        self._logger_voltage_logger_running = True
        self._logger_voltage_logger_thread = threading.Thread(
            target=self._logger_voltage_logger_loop,
            daemon=True,
        )
        self._logger_voltage_logger_thread.start()

    def _init_alarms(self):
        """Initialize alarm monitoring threads."""
        self._alarm_overvoltage_alarm_running = True
        self._alarm_overvoltage_alarm_thread = threading.Thread(
            target=self._alarm_overvoltage_alarm_loop,
            daemon=True,
        )
        self._alarm_overvoltage_alarm_thread.start()

    # --- Event Handlers ---
    def on_btn_read_click(self):
        """Trigger voltage reading from multimeter."""
        self._instr_multimeter_read_voltage()

    def on_btn_stop_click(self):
        """Stop continuous reading mode."""
        self.var_running.set(False)
        self.lbl_status.config(text="Stopped", fg="#f38ba8")

    def on_continuous_toggle(self):
        """Toggle continuous reading."""
        if self.var_running.get():
            self.lbl_status.config(text="Running (continuous)", fg="#a6e3a1")
            self._start_continuous_reading()
        else:
            self.lbl_status.config(text="Ready", fg="#a6e3a1")

    def _start_continuous_reading(self):
        """Start continuous reading loop."""
        if self.var_running.get():
            self._instr_multimeter_read_voltage()
            self.root.after(500, self._start_continuous_reading)

    # --- Instrument Methods ---
    def _instr_multimeter_read_voltage(self):
        """Read DC Voltage."""
        try:
            self.instr_multimeter.write("MEAS:VOLT:DC?\n")
            response = self.instr_multimeter.read()
            value = float(response.strip())
            value = float(value) * 1.0
            # Thread-safe update to tkinter
            self.root.after(0, lambda v=value: self.var_voltage.set(v))
        except Exception as e:
            print(f"Instrument error (read_voltage): {e}")

    def _instr_multimeter_read_idn(self):
        """Identify."""
        try:
            self.instr_multimeter.write("*IDN?\n")
            response = self.instr_multimeter.read()
            value = response.strip()
        except Exception as e:
            print(f"Instrument error (read_idn): {e}")

    # --- Data Logger Loops ---
    def _logger_voltage_logger_loop(self):
        """Data logger loop for voltage_logger."""
        file_path = "./logs/voltage_{date}.csv"
        # Resolve date placeholder
        file_path = file_path.replace("{date}", datetime.now().strftime("%Y%m%d"))
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        # Write CSV header
        import os as _os
        if not _os.path.exists(file_path) or _os.path.getsize(file_path) == 0:
            with open(file_path, "w", newline="") as _f:
                _f.write(",".join(["timestamp", "voltage"]) + "\n")
        while self._logger_voltage_logger_running:
            try:
                row = [datetime.now().isoformat(), self.var_voltage.get()]
                with open(file_path, "a", newline="") as f:
                    writer = csv.writer(f)
                    writer.writerow(row)
            except Exception as e:
                print(f"Logger error (voltage_logger): {e}")
            time.sleep(1.0)

    # --- Alarm Loops ---
    def _alarm_overvoltage_alarm_loop(self):
        """Alarm monitoring loop for overvoltage_alarm."""
        _last_trigger = 0
        while self._alarm_overvoltage_alarm_running:
            try:
                value = self.var_voltage.get()
                _triggered = value > 250.0
                if _triggered:
                    if time.time() - _last_trigger < 5.0:
                        continue
                    _last_trigger = time.time()
                    # Visual alert: flash lbl_voltage_display
                    self.root.after(0, lambda: self.lbl_voltage_display.config(fg="#f38ba8"))
                    # Log alert
                    print(f"ALARM: Voltage {value}V exceeds threshold 250.0V")
                    with open("./logs/alarms.log", "a") as _logf:
                        _logf.write(f"ALARM: Voltage {value}V exceeds threshold 250.0V" + "\n")
                else:
                    # Condition cleared -- reset visual state
                    self.lbl_voltage_display.config(fg="#89dceb")
            except Exception as e:
                print(f"Alarm error (overvoltage_alarm): {e}")
            time.sleep(0.5)

    def _check_alarms_voltage(self, *_):
        """Check alarms triggered by voltage changes (trace callback)."""
        pass  # Alarm loops handle polling; this enables future reactive alarm modes

    # --- Cleanup ---
    def on_closing(self):
        """Clean up resources before application exit."""
        self._logger_voltage_logger_running = False
        if hasattr(self, "_logger_voltage_logger_thread"):
            self._logger_voltage_logger_thread.join(timeout=2.0)
        self._alarm_overvoltage_alarm_running = False
        if hasattr(self, "_alarm_overvoltage_alarm_thread"):
            self._alarm_overvoltage_alarm_thread.join(timeout=2.0)
        if hasattr(self, "instr_multimeter"):
            self.instr_multimeter.close()
        if hasattr(self, "rm_multimeter"):
            self.rm_multimeter.close()
        self.root.destroy()


if __name__ == "__main__":
    root = tk.Tk()
    app = MultimeterReadout(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
```



---

## 4. Schema Validation & Migration

### 4.1 Validation Architecture

Validation runs at load time, before any code generation or designer rendering. A two-stage validator ensures the `.gui.json` file is structurally sound and semantically consistent.

```python
"""
IR Schema Validation Pipeline
==============================

Stage 1: Structural Validation (JSON Schema)
    - Validates that the file conforms to the IR JSON Schema
    - Checks required fields, types, enum values
    - Reports all validation errors at once

Stage 2: Semantic Validation (Business Rules)
    - Cross-reference validation (IDs point to existing nodes)
    - Name uniqueness (no duplicate widget/state variable names)
    - Circular parent references (no widget is its own ancestor)
    - Instrument binding targets exist
    - Alarm sources reference valid state variables
    - Callback names are valid Python identifiers
"""
```

#### 4.1.1 JSON Schema Definition

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://labgui.dev/schema/ir-project-v1.0.0.json",
  "title": "LabGUI IR Project Schema",
  "description": "Intermediate Representation schema for LabGUI Builder projects",
  "type": "object",
  "required": ["version", "name", "metadata", "canvas", "widgets", "state_variables", "instruments", "data_loggers", "alarms", "theme"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^\\d+\\.\\d+\\.\\d+(-[a-zA-Z0-9.]+)?$",
      "description": "IR schema version in semver format"
    },
    "name": {
      "type": "string",
      "minLength": 1,
      "maxLength": 128,
      "description": "Project name"
    },
    "metadata": {
      "type": "object",
      "required": ["created", "modified"],
      "properties": {
        "created": { "type": "string", "format": "date-time" },
        "modified": { "type": "string", "format": "date-time" },
        "author": { "type": "string" },
        "description": { "type": "string" },
        "tkinter_version": { "type": "string" },
        "python_version": { "type": "string" },
        "tags": { "type": "array", "items": { "type": "string" } }
      }
    },
    "canvas": {
      "type": "object",
      "required": ["width", "height", "bg_color", "grid_size"],
      "properties": {
        "width": { "type": "number", "minimum": 100, "maximum": 3840 },
        "height": { "type": "number", "minimum": 100, "maximum": 2160 },
        "bg_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "grid_size": { "type": "number", "minimum": 0, "maximum": 100 },
        "grid_visible": { "type": "boolean" },
        "grid_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "zoom_level": { "type": "number", "minimum": 0.25, "maximum": 4.0 },
        "show_guides": { "type": "boolean" }
      }
    },
    "widgets": {
      "type": "array",
      "items": { "$ref": "#/definitions/IRNode" }
    },
    "state_variables": {
      "type": "array",
      "items": { "$ref": "#/definitions/IRStateVariable" }
    },
    "instruments": {
      "type": "array",
      "items": { "$ref": "#/definitions/IRInstrument" }
    },
    "data_loggers": {
      "type": "array",
      "items": { "$ref": "#/definitions/IRDataLogger" }
    },
    "alarms": {
      "type": "array",
      "items": { "$ref": "#/definitions/IRAlarm" }
    },
    "theme": {
      "type": "object",
      "required": ["palette"],
      "properties": {
        "palette": { "type": "string", "enum": ["default", "dark", "light", "custom"] },
        "primary_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "secondary_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "danger_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "warning_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "success_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "info_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "background_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "surface_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "text_primary_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "text_secondary_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "font_family": { "type": "string" },
        "font_size": { "type": "number", "minimum": 6, "maximum": 72 },
        "border_radius": { "type": "number", "minimum": 0, "maximum": 50 }
      }
    }
  },
  "definitions": {
    "UUID": {
      "type": "string",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
    },
    "WidgetType": {
      "type": "string",
      "enum": ["Button", "Label", "Entry", "Text", "Frame", "Canvas", "Listbox", "Scale", "Checkbutton", "Radiobutton", "Combobox", "Spinbox", "GridContainer"]
    },
    "IRNode": {
      "type": "object",
      "required": ["id", "type", "name", "abstract_props", "geometry", "events", "children"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "type": { "$ref": "#/definitions/WidgetType" },
        "name": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$",
          "description": "Valid Python identifier"
        },
        "abstract_props": {
          "type": "object",
          "properties": {
            "label": { "type": "string" },
            "enabled": { "type": "boolean" },
            "visible": { "type": "boolean" },
            "tooltip": { "type": "string" },
            "help_text": { "type": "string" }
          }
        },
        "geometry": {
          "type": "object",
          "required": ["x", "y", "w", "h"],
          "properties": {
            "x": { "type": "number" },
            "y": { "type": "number" },
            "w": { "type": "number", "minimum": 1 },
            "h": { "type": "number", "minimum": 1 }
          }
        },
        "style": { "$ref": "#/definitions/IRStyle" },
        "events": {
          "type": "array",
          "items": { "$ref": "#/definitions/IREvent" }
        },
        "children": {
          "type": "array",
          "items": { "$ref": "#/definitions/IRNode" }
        },
        "parent": { "$ref": "#/definitions/UUID" },
        "locked": { "type": "boolean" },
        "hidden": { "type": "boolean" },
        "widget_props": { "type": "object" }
      }
    },
    "IRStyle": {
      "type": "object",
      "properties": {
        "bg": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "fg": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "font_family": { "type": "string" },
        "font_size": { "type": "number", "minimum": 6, "maximum": 72 },
        "font_weight": { "type": "string", "enum": ["normal", "bold"] },
        "padding": {
          "type": "array",
          "items": { "type": "number" },
          "minItems": 2,
          "maxItems": 2
        },
        "border_width": { "type": "number", "minimum": 0 },
        "border_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "border_radius": { "type": "number", "minimum": 0 },
        "relief": { "type": "string", "enum": ["flat", "raised", "sunken", "groove", "ridge", "solid"] }
      }
    },
    "IREvent": {
      "type": "object",
      "required": ["type", "callback_name"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["on_click", "on_double_click", "on_change", "on_focus", "on_blur", "on_enter", "on_leave", "on_key_press", "on_key_release", "on_mouse_wheel", "on_resize", "on_validate"]
        },
        "callback_name": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
        },
        "code": { "type": "string" },
        "args": {
          "type": "array",
          "items": { "type": "string" }
        },
        "description": { "type": "string" }
      }
    },
    "IRStateVariable": {
      "type": "object",
      "required": ["id", "name", "type", "default"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "name": {
          "type": "string",
          "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$"
        },
        "type": { "type": "string", "enum": ["string", "int", "float", "bool"] },
        "default": {},
        "format": { "type": "string" },
        "description": { "type": "string" },
        "min": { "type": "number" },
        "max": { "type": "number" },
        "readonly": { "type": "boolean" },
        "persist": { "type": "boolean" }
      }
    },
    "IRInstrument": {
      "type": "object",
      "required": ["id", "name", "protocol", "config", "commands", "bindings", "enabled"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "name": { "type": "string", "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$" },
        "display_name": { "type": "string" },
        "protocol": { "type": "string", "enum": ["visa", "serial", "tcp", "udp", "modbus"] },
        "config": { "type": "object" },
        "commands": {
          "type": "array",
          "items": { "$ref": "#/definitions/IRInstrumentCommand" }
        },
        "bindings": {
          "type": "array",
          "items": { "$ref": "#/definitions/IRInstrumentBinding" }
        },
        "auto_connect": { "type": "boolean" },
        "reconnect": { "type": "boolean" },
        "reconnect_interval_ms": { "type": "number" },
        "description": { "type": "string" },
        "enabled": { "type": "boolean" }
      }
    },
    "IRInstrumentCommand": {
      "type": "object",
      "required": ["id", "name", "send", "parse_type"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "name": { "type": "string", "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$" },
        "display_name": { "type": "string" },
        "send": { "type": "string" },
        "parse_type": { "type": "string", "enum": ["float", "int", "string", "bytes", "regex", "json", "none"] },
        "parse_pattern": { "type": "string" },
        "parse_json_path": { "type": "string" },
        "timeout": { "type": "number" },
        "delay_before": { "type": "number" },
        "delay_after": { "type": "number" },
        "terminator": { "type": "string" },
        "description": { "type": "string" }
      }
    },
    "IRInstrumentBinding": {
      "type": "object",
      "required": ["id", "command_id", "target_type", "target_id", "target_property", "mode", "enabled"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "command_id": { "$ref": "#/definitions/UUID" },
        "target_type": { "type": "string", "enum": ["widget", "state", "both"] },
        "target_id": { "type": "string" },
        "target_property": { "type": "string" },
        "mode": { "type": "string", "enum": ["polled", "triggered", "manual"] },
        "interval_ms": { "type": "number" },
        "trigger_event": { "type": "string" },
        "trigger_widget_id": { "$ref": "#/definitions/UUID" },
        "transform": { "type": "string" },
        "enabled": { "type": "boolean" }
      }
    },
    "IRDataLogger": {
      "type": "object",
      "required": ["id", "name", "sources", "format", "file_path", "interval_ms", "max_file_size_mb", "include_timestamp", "timestamp_format", "enabled"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "name": { "type": "string", "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$" },
        "sources": {
          "type": "array",
          "items": { "type": "string" }
        },
        "format": { "type": "string", "enum": ["csv", "json", "tsv"] },
        "file_path": { "type": "string" },
        "interval_ms": { "type": "number", "minimum": 10 },
        "max_file_size_mb": { "type": "number", "minimum": 0 },
        "max_files": { "type": "number", "minimum": 0 },
        "include_timestamp": { "type": "boolean" },
        "timestamp_format": { "type": "string", "enum": ["iso", "unix_ms", "unix_s", "elapsed_ms", "elapsed_s"] },
        "header_style": { "type": "string", "enum": ["none", "once", "each"] },
        "enabled": { "type": "boolean" },
        "description": { "type": "string" }
      }
    },
    "IRAlarm": {
      "type": "object",
      "required": ["id", "name", "source", "condition", "threshold", "severity", "actions", "enabled"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "name": { "type": "string", "pattern": "^[a-zA-Z_][a-zA-Z0-9_]*$" },
        "display_name": { "type": "string" },
        "source": { "type": "string" },
        "source_property": { "type": "string" },
        "condition": { "type": "string", "enum": ["gt", "lt", "gte", "lte", "eq", "neq", "in_range", "out_of_range", "changed"] },
        "threshold": {},
        "severity": { "type": "string", "enum": ["info", "warning", "critical"] },
        "actions": {
          "type": "array",
          "items": { "$ref": "#/definitions/IRAlarmAction" }
        },
        "debounce_ms": { "type": "number" },
        "cooldown_ms": { "type": "number" },
        "enabled": { "type": "boolean" },
        "auto_acknowledge": { "type": "boolean" },
        "description": { "type": "string" }
      }
    },
    "IRAlarmAction": {
      "type": "object",
      "required": ["id", "type", "enabled"],
      "properties": {
        "id": { "$ref": "#/definitions/UUID" },
        "type": { "type": "string", "enum": ["visual", "log", "script", "sound", "notification"] },
        "enabled": { "type": "boolean" },
        "target_widget": { "type": "string" },
        "flash_color": { "type": "string", "pattern": "^#[0-9a-fA-F]{6}$" },
        "flash_duration_ms": { "type": "number" },
        "flash_count": { "type": "number" },
        "set_widget_state": { "type": "string", "enum": ["normal", "disabled", "hidden"] },
        "log_level": { "type": "string", "enum": ["debug", "info", "warning", "error", "critical"] },
        "log_message": { "type": "string" },
        "log_target": { "type": "string", "enum": ["console", "file", "both"] },
        "log_file_path": { "type": "string" },
        "script": { "type": "string" },
        "sound_file": { "type": "string" },
        "notification_title": { "type": "string" },
        "notification_message": { "type": "string" }
      }
    }
  }
}
```

#### 4.1.2 Validation Implementation

```python
import json
from typing import List, Dict, Any, Optional
import jsonschema
from jsonschema import validate, ValidationError


class IRValidator:
    """Two-stage IR validator: structural + semantic."""

    def __init__(self, schema_path: Optional[str] = None):
        if schema_path:
            with open(schema_path) as f:
                self.schema = json.load(f)
        else:
            self.schema = self._load_builtin_schema()

    def validate(self, project: Dict[str, Any]) -> List[str]:
        """
        Validate a project IR. Returns a list of error messages.
        An empty list means the project is valid.
        """
        errors = []
        
        # Stage 1: JSON Schema validation
        errors.extend(self._validate_structure(project))
        
        # Stage 2: Semantic validation (only if structure is valid)
        if not errors:
            errors.extend(self._validate_semantics(project))
        
        return errors

    def _validate_structure(self, project: Dict) -> List[str]:
        """Stage 1: Validate against JSON Schema."""
        errors = []
        try:
            validate(instance=project, schema=self.schema)
        except ValidationError as e:
            # Collect all validation errors
            from jsonschema import Draft7Validator
            validator = Draft7Validator(self.schema)
            for error in validator.iter_errors(project):
                path = " -> ".join(str(p) for p in error.absolute_path)
                errors.append(f"[Structure] {path}: {error.message}")
        return errors

    def _validate_semantics(self, project: Dict) -> List[str]:
        """Stage 2: Validate cross-references and business rules."""
        errors = []
        
        # Build lookup tables
        widget_ids = {}
        widget_names = set()
        state_var_names = set()
        instrument_ids = {}
        command_ids = {}
        
        def walk_widgets(node):
            widget_ids[node["id"]] = node
            if node["name"] in widget_names:
                errors.append(f"[Semantic] Duplicate widget name: '{node['name']}'")
            widget_names.add(node["name"])
            for child in node.get("children", []):
                walk_widgets(child)
        
        for widget in project.get("widgets", []):
            walk_widgets(widget)
        
        for sv in project.get("state_variables", []):
            state_var_names.add(sv["name"])
        
        for inst in project.get("instruments", []):
            instrument_ids[inst["id"]] = inst
            for cmd in inst.get("commands", []):
                command_ids[cmd["id"]] = cmd
        
        # Rule 1: Parent references must exist
        def check_parents(node):
            if node.get("parent") and node["parent"] not in widget_ids:
                errors.append(f"[Semantic] Widget '{node['name']}' references unknown parent: {node['parent']}")
            for child in node.get("children", []):
                check_parents(child)
        
        for widget in project.get("widgets", []):
            check_parents(widget)
        
        # Rule 2: No circular parent references
        def check_circularity(node, ancestors=None):
            ancestors = ancestors or set()
            if node["id"] in ancestors:
                errors.append(f"[Semantic] Circular parent reference involving widget: '{node['name']}'")
                return
            ancestors = ancestors | {node["id"]}
            for child in node.get("children", []):
                check_circularity(child, ancestors)
        
        for widget in project.get("widgets", []):
            check_circularity(widget)
        
        # Rule 3: Callback names must be valid Python identifiers
        def check_callbacks(node):
            for event in node.get("events", []):
                cb = event["callback_name"]
                if not cb.isidentifier():
                    errors.append(f"[Semantic] Invalid callback name '{cb}' in widget '{node['name']}'")
                if cb.startswith("_instr_"):
                    errors.append(f"[Semantic] Callback name '{cb}' in widget '{node['name']}' is reserved for instrument methods")
            for child in node.get("children", []):
                check_callbacks(child)
        
        for widget in project.get("widgets", []):
            check_callbacks(widget)
        
        # Rule 4: State variable bindings must reference existing variables
        for widget in project.get("widgets", []):
            self._check_widget_bindings(widget, state_var_names, errors)
        
        # Rule 5: Instrument bindings must reference existing commands and targets
        for inst in project.get("instruments", []):
            for binding in inst.get("bindings", []):
                if binding["command_id"] not in command_ids:
                    errors.append(f"[Semantic] Binding references unknown command: {binding['command_id']}")
                if binding["target_type"] == "state" and binding["target_id"] not in state_var_names:
                    errors.append(f"[Semantic] Binding targets unknown state variable: '{binding['target_id']}'")
                if binding["target_type"] == "widget" and binding["target_id"] not in widget_ids:
                    errors.append(f"[Semantic] Binding targets unknown widget: '{binding['target_id']}'")
        
        # Rule 6: Alarm sources must reference existing state variables
        for alarm in project.get("alarms", []):
            if alarm["source"] not in state_var_names:
                errors.append(f"[Semantic] Alarm '{alarm['name']}' references unknown source variable: '{alarm['source']}'")
            
            # Alarm actions must reference existing widgets
            for action in alarm.get("actions", []):
                if action.get("target_widget") and action["target_widget"] not in widget_names:
                    errors.append(f"[Semantic] Alarm action targets unknown widget: '{action['target_widget']}'")
        
        # Rule 7: Data logger sources must reference existing state variables
        for logger in project.get("data_loggers", []):
            for src in logger.get("sources", []):
                if src not in state_var_names:
                    errors.append(f"[Semantic] Data logger '{logger['name']}' references unknown source: '{src}'")
        
        # Rule 8: GridContainer children must not exceed grid capacity
        def check_grid_capacity(node):
            if node.get("type") == "GridContainer":
                props = node.get("widget_props", {})
                rows = props.get("rows", 1)
                cols = props.get("columns", 1)
                capacity = rows * cols
                children = len(node.get("children", []))
                if children > capacity:
                    errors.append(
                        f"[Semantic] GridContainer '{node['name']}' has {children} children "
                        f"but grid capacity is {rows}x{cols}={capacity}"
                    )
            for child in node.get("children", []):
                check_grid_capacity(child)
        
        for widget in project.get("widgets", []):
            check_grid_capacity(widget)
        
        return errors

    def _check_widget_bindings(self, node: Dict, state_vars: set, errors: List[str]):
        """Check that widget state variable references are valid."""
        props = node.get("widget_props", {})
        var_fields = ["textvariable", "variable", "listvariable"]
        
        for field in var_fields:
            if field in props and props[field] and props[field] not in state_vars:
                errors.append(
                    f"[Semantic] Widget '{node['name']}' references unknown "
                    f"state variable in '{field}': '{props[field]}'"
                )
        
        for child in node.get("children", []):
            self._check_widget_bindings(child, state_vars, errors)
```

#### 4.1.3 Validation Usage

```python
# Usage example
validator = IRValidator()

with open("project.gui.json") as f:
    project = json.load(f)

errors = validator.validate(project)

if errors:
    print(f"Validation failed with {len(errors)} error(s):")
    for err in errors:
        print(f"  - {err}")
else:
    print("Validation passed!")
    # Proceed with code generation
    gen = TkinterGenerator(project)
    code = gen.generate()
```

### 4.2 Version Migration Strategy

When the IR schema evolves, existing `.gui.json` files must be automatically migrated. The migration system uses a chain of version transformers.

#### 4.2.1 Migration Registry

```python
from typing import Callable, Dict, Any
from functools import wraps

# Registry of migrations: "from_version" -> migration function
MIGRATIONS: Dict[str, Callable[[Dict], Dict]] = {}


def migration(from_version: str, to_version: str):
    """Decorator to register a migration function."""
    def decorator(func: Callable[[Dict], Dict]):
        @wraps(func)
        def wrapper(project: Dict) -> Dict:
            result = func(project)
            result["version"] = to_version
            return result
        MIGRATIONS[from_version] = wrapper
        return wrapper
    return decorator


def migrate(project: Dict, target_version: str = CURRENT_SCHEMA_VERSION) -> Dict:
    """
    Migrate a project IR to the target schema version.
    Applies migrations sequentially until target version is reached.
    """
    current = project.get("version", "0.0.0")
    
    if current == target_version:
        return project
    
    visited = set()
    while current != target_version:
        if current in visited:
            raise ValueError(f"Migration loop detected at version {current}")
        visited.add(current)
        
        if current not in MIGRATIONS:
            raise ValueError(f"No migration path from {current} to {target_version}")
        
        project = MIGRATIONS[current](project)
        current = project["version"]
    
    return project
```

#### 4.2.2 Example Migration: v0.9.0 -> v1.0.0

```python
@migration(from_version="0.9.0", to_version="1.0.0")
def migrate_0_9_0_to_1_0_0(project: Dict) -> Dict:
    """
    Migrate from v0.9.0 to v1.0.0.
    
    Changes:
    - Added 'severity' field to alarms (default: 'warning')
    - Added 'enabled' field to instruments (default: True)
    - Added 'auto_acknowledge' field to alarms (default: False)
    - Renamed 'widget_props' borderWidth -> border_width
    - Renamed 'widget_props' borderColor -> border_color
    - Added 'locked' and 'hidden' fields to IRNode (default: False)
    """
    
    # Migrate alarms: add severity, auto_acknowledge
    for alarm in project.get("alarms", []):
        if "severity" not in alarm:
            alarm["severity"] = "warning"
        if "auto_acknowledge" not in alarm:
            alarm["auto_acknowledge"] = False
        
        # Migrate alarm actions: wrap in new action structure
        if "actions" in alarm and alarm["actions"]:
            new_actions = []
            for old_action in alarm["actions"]:
                new_action = {
                    "id": old_action.get("id", str(uuid.uuid4())),
                    "type": old_action.get("type", "log"),
                    "enabled": old_action.get("enabled", True),
                }
                # Copy type-specific fields
                if old_action.get("target_widget"):
                    new_action["target_widget"] = old_action["target_widget"]
                if old_action.get("flash_color"):
                    new_action["flash_color"] = old_action["flash_color"]
                if old_action.get("log_message"):
                    new_action["log_message"] = old_action["log_message"]
                if old_action.get("script"):
                    new_action["script"] = old_action["script"]
                new_actions.append(new_action)
            alarm["actions"] = new_actions
    
    # Migrate instruments: add enabled
    for inst in project.get("instruments", []):
        if "enabled" not in inst:
            inst["enabled"] = True
    
    # Migrate widgets: add locked, hidden; rename border properties
    def walk_widgets(node):
        if "locked" not in node:
            node["locked"] = False
        if "hidden" not in node:
            node["hidden"] = False
        
        # Rename border properties in widget_props
        props = node.get("widget_props", {})
        if "borderWidth" in props:
            props["border_width"] = props.pop("borderWidth")
        if "borderColor" in props:
            props["border_color"] = props.pop("borderColor")
        
        for child in node.get("children", []):
            walk_widgets(child)
    
    for widget in project.get("widgets", []):
        walk_widgets(widget)
    
    # Add metadata.python_version if missing
    if "metadata" in project and "python_version" not in project["metadata"]:
        project["metadata"]["python_version"] = "3.10"
    
    return project
```

#### 4.2.3 Migration Chain Example

```python
# Example: Loading an old project and migrating it
import uuid

CURRENT_SCHEMA_VERSION = "1.0.0"

# Register additional migrations
@migration(from_version="0.8.0", to_version="0.9.0")
def migrate_0_8_0_to_0_9_0(project: Dict) -> Dict:
    """Migrate from v0.8.0 to v0.9.0: added instrument bindings."""
    for inst in project.get("instruments", []):
        if "bindings" not in inst:
            inst["bindings"] = []
    return project


# Usage
old_project = {
    "version": "0.8.0",
    # ... old project data
}

migrated = migrate(old_project)  # 0.8.0 -> 0.9.0 -> 1.0.0
print(f"Migrated from 0.8.0 to {migrated['version']}")
```

#### 4.2.4 Migration Logging

```python
import logging

logger = logging.getLogger("labgui.migration")


def migrate_with_logging(project: Dict, target_version: str = CURRENT_SCHEMA_VERSION) -> Dict:
    """Migrate with detailed logging for transparency."""
    current = project.get("version", "0.0.0")
    
    if current == target_version:
        logger.info(f"Project already at target version {target_version}")
        return project
    
    logger.info(f"Starting migration: {current} -> {target_version}")
    
    steps = []
    visited = set()
    while current != target_version:
        if current in visited:
            raise ValueError(f"Migration loop at {current}")
        visited.add(current)
        
        next_migration = MIGRATIONS.get(current)
        if not next_migration:
            raise ValueError(f"No migration from {current}")
        
        project = next_migration(project)
        steps.append(current)
        current = project["version"]
        logger.info(f"  Applied migration: {steps[-1]} -> {current}")
    
    logger.info(f"Migration complete in {len(steps)} step(s)")
    return project
```

---

## 5. Widget Property Defaults Table

This table defines the default value for every property of every widget type. The code generator uses these defaults to decide whether to emit a kwarg (only emit when value differs from default, unless required).

### 5.1 Button

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `text` | string | `""` | `text` | Always | Required |
| `command` | string | `null` | `command` | If set | Method name |
| `relief` | enum | `"raised"` | `relief` | If != `"raised"` | |
| `default_state` | enum | `"normal"` | N/A | If != `"normal"` | Applied via `state()` |
| `image` | string | `null` | `image` | If set | |
| `compound` | enum | `"none"` | `compound` | If != `"none"` | |
| `repeatdelay` | number | `null` | `repeatdelay` | If set | ms |
| `repeatinterval` | number | `null` | `repeatinterval` | If set | ms |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.2 Label

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `text` | string | `""` | `text` | Always | Required |
| `textvariable` | string | `null` | `textvariable` | If set | Variable name |
| `anchor` | enum | `"center"` | `anchor` | If != `"center"` | |
| `wraplength` | number | `0` | `wraplength` | If > 0 | Pixels |
| `justify` | enum | `"center"` | `justify` | If != `"center"` | |
| `image` | string | `null` | `image` | If set | |
| `compound` | enum | `"none"` | `compound` | If != `"none"` | |

### 5.3 Entry

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `textvariable` | string | `null` | `textvariable` | If set | Variable name |
| `show` | string | `null` | `show` | If set | `"*"` for passwords |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `validate` | enum | `"none"` | `validate` | If != `"none"` | |
| `validatecommand` | string | `null` | `validatecommand` | If validate != `"none"` | |
| `width` | number | `null` | `width` | If set | Character width |
| `justify` | enum | `"left"` | `justify` | If != `"left"` | |
| `selectbackground` | string | `null` | `selectbackground` | If set | Selection color |
| `selectforeground` | string | `null` | `selectforeground` | If set | Selection text color |
| `exportselection` | boolean | `true` | `exportselection` | If `false` | |
| `xscrollcommand` | string | `null` | `xscrollcommand` | If set | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.4 Text

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `text` | string | `""` | `insert` | If set | Inserted after creation |
| `textvariable` | string | `null` | N/A | If set | Manual trace sync |
| `wrap` | enum | `"char"` | `wrap` | If != `"char"` | |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `height` | number | `null` | `height` | If set | Lines |
| `width` | number | `null` | `width` | If set | Characters |
| `padx` | number | `1` | `padx` | If != `1` | Internal padding |
| `pady` | number | `1` | `pady` | If != `1` | Internal padding |
| `undo` | boolean | `false` | `undo` | If `true` | |
| `maxundo` | number | `0` | `maxundo` | If set | |
| `autoseparators` | boolean | `true` | `autoseparators` | If `false` | |
| `tabs` | string | `null` | `tabs` | If set | |
| `spacing1` | number | `0` | `spacing1` | If != `0` | |
| `spacing2` | number | `0` | `spacing2` | If != `0` | |
| `spacing3` | number | `0` | `spacing3` | If != `0` | |
| `xscrollcommand` | string | `null` | `xscrollcommand` | If set | |
| `yscrollcommand` | string | `null` | `yscrollcommand` | If set | |
| `exportselection` | boolean | `true` | `exportselection` | If `false` | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |
| `setgrid` | boolean | `false` | `setgrid` | If `true` | |

### 5.5 Frame

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `relief` | enum | `"flat"` | `relief` | If != `"flat"` | |
| `borderwidth` | number | `0` | `bd` | If > 0 | |
| `label` | string | `null` | `text` | If set | Uses LabelFrame |
| `labelanchor` | enum | `"nw"` | `labelanchor` | If != `"nw"` | Only with label |
| `padding` | [number, number] | `null` | `padx, pady` | If set | |
| `takefocus` | boolean | `false` | `takefocus` | If `true` | |
| `container` | boolean | `false` | `container` | If `true` | |

### 5.6 Canvas

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `scrollregion` | [4x number] | `null` | `scrollregion` | If set | `[x1, y1, x2, y2]` |
| `confine` | boolean | `true` | `confine` | If `false` | |
| `closeenough` | number | `1.0` | `closeenough` | If != `1.0` | Hit tolerance |
| `xscrollcommand` | string | `null` | `xscrollcommand` | If set | |
| `yscrollcommand` | string | `null` | `yscrollcommand` | If set | |
| `xscrollincrement` | number | `0` | `xscrollincrement` | If > 0 | |
| `yscrollincrement` | number | `0` | `yscrollincrement` | If > 0 | |
| `selectbackground` | string | `null` | `selectbackground` | If set | |
| `selectforeground` | string | `null` | `selectforeground` | If set | |
| `selectborderwidth` | number | `1` | `selectborderwidth` | If != `1` | |
| `insertbackground` | string | `null` | `insertbackground` | If set | |
| `insertwidth` | number | `2` | `insertwidth` | If != `2` | |
| `insertontime` | number | `600` | `insertontime` | If != `600` | ms |
| `insertofftime` | number | `300` | `insertofftime` | If != `300` | ms |

### 5.7 Listbox

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `values` | string[] | `[]` | `insert` | If non-empty | Inserted after creation |
| `selectmode` | enum | `"browse"` | `selectmode` | If != `"browse"` | |
| `height` | number | `10` | `height` | If != `10` | Visible lines |
| `width` | number | `20` | `width` | If != `20` | Character width |
| `listvariable` | string | `null` | `listvariable` | If set | StringVar |
| `activestyle` | enum | `"underline"` | `activestyle` | If != `"underline"` | |
| `exportselection` | boolean | `true` | `exportselection` | If `false` | |
| `selectbackground` | string | `null` | `selectbackground` | If set | |
| `selectforeground` | string | `null` | `selectforeground` | If set | |
| `selectborderwidth` | number | `1` | `selectborderwidth` | If != `1` | |
| `setgrid` | boolean | `false` | `setgrid` | If `true` | |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `xscrollcommand` | string | `null` | `xscrollcommand` | If set | |
| `yscrollcommand` | string | `null` | `yscrollcommand` | If set | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.8 Scale

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `orient` | enum | `"vertical"` | `orient` | If != `"vertical"` | |
| `from_` | number | `0` | `from_` | Always | Required |
| `to` | number | `100` | `to` | Always | Required |
| `resolution` | number | `1` | `resolution` | If != `1` | |
| `tickinterval` | number | `0` | `tickinterval` | If > 0 | `0` = no ticks |
| `variable` | string | `null` | `variable` | If set | DoubleVar/IntVar name |
| `digits` | number | `0` | `digits` | If > 0 | Precision |
| `showvalue` | boolean | `true` | `showvalue` | If `false` | |
| `sliderlength` | number | `30` | `sliderlength` | If != `30` | Pixels |
| `sliderrelief` | enum | `"raised"` | `sliderrelief` | If != `"raised"` | |
| `length` | number | `100` | `length` | If != `100` | Long axis pixels |
| `width` | number | `15` | `width` | If != `15` | Short axis pixels |
| `troughcolor` | string | `null` | `troughcolor` | If set | |
| `command` | string | `null` | `command` | If set | Callback name |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.9 Checkbutton

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `text` | string | `""` | `text` | Always | Required |
| `variable` | string | `null` | `variable` | If set | BooleanVar name |
| `onvalue` | any | `true` | `onvalue` | If != `true` | |
| `offvalue` | any | `false` | `offvalue` | If != `false` | |
| `indicatoron` | boolean | `true` | `indicatoron` | If `false` | Button style |
| `command` | string | `null` | `command` | If set | |
| `selectcolor` | string | `null` | `selectcolor` | If set | |
| `selectimage` | string | `null` | `selectimage` | If set | |
| `tristatevalue` | string | `""` | `tristatevalue` | If set | |
| `width` | number | `0` | `width` | If > 0 | Character width |
| `height` | number | `0` | `height` | If > 0 | Lines |
| `anchor` | enum | `"center"` | `anchor` | If != `"center"` | |
| `justify` | enum | `"center"` | `justify` | If != `"center"` | |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.10 Radiobutton

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `text` | string | `""` | `text` | Always | Required |
| `variable` | string | `null` | `variable` | If set | Shared variable name |
| `value` | any | `null` | `value` | Always | Required — this button's value |
| `indicatoron` | boolean | `true` | `indicatoron` | If `false` | Button style |
| `command` | string | `null` | `command` | If set | |
| `selectcolor` | string | `null` | `selectcolor` | If set | |
| `selectimage` | string | `null` | `selectimage` | If set | |
| `width` | number | `0` | `width` | If > 0 | |
| `height` | number | `0` | `height` | If > 0 | |
| `anchor` | enum | `"center"` | `anchor` | If != `"center"` | |
| `justify` | enum | `"center"` | `justify` | If != `"center"` | |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.11 Combobox

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `values` | string[] | `[]` | `values` | If non-empty | Required |
| `textvariable` | string | `null` | `textvariable` | If set | StringVar |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | `"readonly"` = pick-only |
| `width` | number | `20` | `width` | If != `20` | Character width |
| `height` | number | `null` | `height` | If set | Dropdown rows |
| `exportselection` | boolean | `true` | `exportselection` | If `false` | |
| `justify` | enum | `"left"` | `justify` | If != `"left"` | |
| `postcommand` | string | `null` | `postcommand` | If set | |
| `validate` | enum | `"none"` | `validate` | If != `"none"` | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |

### 5.12 Spinbox

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `from_` | number | `null` | `from_` | If set (and no `values`) | |
| `to` | number | `null` | `to` | If set (and no `values`) | |
| `increment` | number | `1` | `increment` | If != `1` | |
| `values` | string[] | `null` | `values` | If set | Overrides from_/to |
| `textvariable` | string | `null` | `textvariable` | If set | |
| `wrap` | boolean | `false` | `wrap` | If `true` | |
| `width` | number | `20` | `width` | If != `20` | |
| `format` | string | `null` | `format` | If set | printf-style |
| `command` | string | `null` | `command` | If set | |
| `state` | enum | `"normal"` | `state` | If != `"normal"` | |
| `justify` | enum | `"left"` | `justify` | If != `"left"` | |
| `exportselection` | boolean | `true` | `exportselection` | If `false` | |
| `takefocus` | boolean | `true` | `takefocus` | If `false` | |
| `repeatdelay` | number | `400` | `repeatdelay` | If != `400` | ms |
| `repeatinterval` | number | `100` | `repeatinterval` | If != `100` | ms |

### 5.13 GridContainer

| Property | Type | Default | tkinter Option | Emit When | Notes |
|---|---|---|---|---|---|
| `rows` | number | `1` | `grid_rowconfigure` | Always | Required |
| `columns` | number | `1` | `grid_columnconfigure` | Always | Required |
| `padding` | [number, number] | `null` | `padx, pady` | If set | Cell padding |
| `row_weights` | IRGridWeightConfig[] | `[]` | `grid_rowconfigure` | If non-empty | Per-row config |
| `col_weights` | IRGridWeightConfig[] | `[]` | `grid_columnconfigure` | If non-empty | Per-column config |
| `uniform_rows` | string | `null` | `uniform` | If set | Group name |
| `uniform_cols` | string | `null` | `uniform` | If set | Group name |
| `sticky_default` | string | `""` | `sticky` | If non-empty | Default for children |
| `borderwidth` | number | `2` | `bd` | If != `2` | |
| `relief` | enum | `"groove"` | `relief` | If != `"groove"` | |
| `label` | string | `null` | `text` | If set | Frame label |

### 5.14 Abstract Props (All Widgets)

| Property | Type | Default | Notes |
|---|---|---|---|
| `label` | string | `null` | Human-readable name in designer |
| `enabled` | boolean | `true` | Interactive state |
| `visible` | boolean | `true` | Rendered state |
| `tooltip` | string | `null` | Hover tooltip text |
| `help_text` | string | `null` | Longer help documentation |

### 5.15 Geometry (All Widgets)

| Property | Type | Default | Notes |
|---|---|---|---|
| `x` | number | `0` | Left position in CSS pixels |
| `y` | number | `0` | Top position in CSS pixels |
| `w` | number | `100` | Width in CSS pixels |
| `h` | number | `30` | Height in CSS pixels |

### 5.16 Style (All Widgets)

| Property | Type | Default | tkinter Option | Notes |
|---|---|---|---|---|
| `bg` | string | `null` | `bg` | Hex color |
| `fg` | string | `null` | `fg` | Hex color |
| `font_family` | string | `"TkDefaultFont"` | `font` family | |
| `font_size` | number | `10` | `font` size | Points |
| `font_weight` | enum | `"normal"` | `font` weight | `"bold"` or `"normal"` |
| `padding` | [number, number] | `null` | `padx, pady` | [vertical, horizontal] |
| `border_width` | number | `null` | `bd` | Pixels |
| `border_color` | string | `null` | `highlightbackground` | Hex color |
| `border_radius` | number | `0` | N/A | Not natively supported |
| `relief` | enum | `null` | `relief` | Widget-type default |

---

## Appendix A: File Structure

```
labgui/
├── schema/
│   ├── ir-project-v1.0.0.json       # JSON Schema for validation
│   └── ir-project-v1.0.0.ts         # TypeScript interfaces
├── generator/
│   ├── __init__.py
│   ├── tkinter_generator.py         # TkinterGenerator class
│   ├── visitor.py                   # Base visitor interface
│   ├── layout.py                    # Layout helpers (place/grid)
│   └── templates/
│       ├── header.py.tpl            # File header template
│       ├── class_def.py.tpl         # Class definition template
│       └── main_block.py.tpl        # if __name__ block template
├── validator/
│   ├── __init__.py
│   ├── validator.py                 # IRValidator class
│   └── rules.py                     # Semantic validation rules
├── migration/
│   ├── __init__.py
│   ├── registry.py                  # Migration registry
│   └── versions/
│       ├── v0_8_0_to_0_9_0.py
│       └── v0_9_0_to_1_0_0.py
└── __init__.py
```

## Appendix B: Glossary

| Term | Definition |
|---|---|
| **IR** | Intermediate Representation — the JSON data structure that is the source of truth for a project |
| **Node** | A single widget instance in the IR tree |
| **Widget Props** | Widget-type-specific properties (e.g., Button's `command`, Label's `anchor`) |
| **Abstract Props** | Properties common to all widgets (e.g., `enabled`, `visible`, `tooltip`) |
| **State Variable** | A tkinter variable (`StringVar`, `IntVar`, `DoubleVar`, `BooleanVar`) used for two-way binding |
| **Binding** | A connection between an instrument command output and a widget/state variable |
| **CSS Pixel** | A virtual pixel unit at 96 DPI, used consistently in the IR for coordinates |
| **Generator** | The code that transforms IR into target language code (Python/tkinter) |
| **Visitor** | A design pattern where operations are separated from the object structure |

---

*End of Specification — Version 1.0.0*
