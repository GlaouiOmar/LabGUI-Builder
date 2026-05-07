# Functional Architecture Specification

## tkinter Lab GUI Builder — Web Application

**Version**: 1.0  
**Status**: Draft for Implementation  
**Target**: Browser-based visual designer for Python tkinter GUIs in lab/scientific instrumentation environments  
**Core Principle**: The `.gui.json` Intermediate Representation (IR) file is the single source of truth. Exported `.py` files are derived, disposable, and non-round-trippable.

---

## 1. Application Structure (Screen Layout)

### 1.1 Overall Layout Model

The application uses a **3-column + header + footer** layout model built on a CSS Grid:

```
+--------------------------------------------------------------------+
| HEADER BAR (fixed, 48px height, z-index: 100)                      |
+------------+------------------------------+------------------------+
|            |                              |                        |
| LEFT       |   CENTER CANVAS              |   RIGHT SIDEBAR        |
| SIDEBAR    |   (flexible, fills space)    |   (tabbed, 280px)      |
| (240px)    |                              |                        |
|            |                              |                        |
| Tabbed:    |   - Design surface           | Tabbed:                |
|   Widgets  |   - Rulers (optional)        |   Properties           |
|   Templates|   - Infinite canvas feel     |   Widget Tree          |
|            |   - Grid overlay             |   State Variables      |
|            |                              |   Instruments          |
|            |                              |                        |
+------------+------------------------------+------------------------+
| BOTTOM PANEL (collapsible, max 300px, default collapsed)           |
|   Tabbed: Live Code | Event Log                                          |
+--------------------------------------------------------------------+
```

**Responsive behavior**: Left and right sidebars are collapsible via toggle buttons in the header. On screens < 1280px wide, the right sidebar auto-collapses to icon-only mode (36px) with tooltips; clicking an icon expands it. On screens < 1024px wide, both sidebars collapse to icon mode.

**Color scheme**: Dark theme by default (reduces eye strain in lab environments). Canvas background: `#1e1e2e` (dark slate). Panel backgrounds: `#181825`. Borders/dividers: `#313244` 1px solid. Accent: `#89b4fa` (blue) for selections, `#f38ba8` (pink) for active states.

---

### 1.2 Header Bar

**Position**: Fixed top, full width, height 48px.  
**Background**: `#11111b` with bottom border `#313244` 1px solid.  
**Layout**: Flexbox, `justify-content: space-between`, `align-items: center`, padding 0 16px.

**Left group**:
| Element | Type | Spec |
|---------|------|------|
| App Logo | SVG icon + text | 24px icon (wrench + gauge) + "LabGUI" text, font 16px/600, color `#cdd6f4` |
| Project Name | Editable text | Inline editable on click. Default "Untitled Project". Font 14px/400, color `#a6adc8`. Shows "*" prefix when unsaved changes exist. Max 64 chars. On blur or Enter: triggers rename + saves to IR. |
| Save Status | Indicator dot | 8px circle. Green (`#a6e3a1`) = saved, yellow (`#f9e2af`) = saving, red (`#f38ba8`) = error. Tooltip on hover: "Last saved 2m ago" or "Unsaved changes". |

**Center group**:
| Element | Type | Spec |
|---------|------|------|
| Undo | Icon button | 20px curved-left-arrow icon. Disabled (opacity 0.3) when undo stack empty. Tooltip: "Undo (Ctrl+Z)". |
| Redo | Icon button | 20px curved-right-arrow icon. Disabled when redo stack empty. Tooltip: "Redo (Ctrl+Y / Ctrl+Shift+Z)". |
| Separator | Vertical line | 1px `#313244`, height 24px. |
| Zoom Label | Text | Displays "100%" or fit-to-screen indicator. Click opens zoom dropdown (50%, 75%, 100%, 125%, 150%, 200%, Fit). |
| Zoom Out | Icon button | Minus icon. Decrements zoom by 10% per click, min 25%. |
| Zoom In | Icon button | Plus icon. Increments zoom by 10% per click, max 300%. |
| Fit to Screen | Icon button | Expand icon. Sets zoom so entire widget bounds fit in canvas viewport with 20px padding. |
| Separator | Vertical line | 1px `#313244`, height 24px. |
| Snap to Grid Toggle | Toggle button | Grid icon. Pressed state = snap enabled (default: ON). Grid size configurable via dropdown on right-click: 4px, 8px (default), 16px, 32px. Visual indicator: subtle blue underline when active. |
| Show Grid Toggle | Toggle button | Dot-grid icon. Pressed state = grid visible (default: ON). Grid rendered as 1px `#313244` dots at configured snap interval. |

**Right group**:
| Element | Type | Spec |
|---------|------|------|
| Run Preview | Primary button | Play icon + "Run Preview" text. Background `#89b4fa`, text `#1e1e2e`, font 13px/600, padding 6px 14px, border-radius 4px. Hover: `#b4befe`. Click: triggers preview generation flow (see §3.4). |
| Export | Secondary button | Download icon + "Export .py" text. Background transparent, border 1px `#585b70`, text `#cdd6f4`. Hover: background `#313244`. Click: opens Export modal (see §1.6). |
| Settings | Icon button | Gear icon. Tooltip: "Settings". Opens Settings modal. |
| Left Panel Toggle | Icon button | Panel-left icon. Toggles left sidebar visibility. Active state: icon highlighted. |
| Right Panel Toggle | Icon button | Panel-right icon. Toggles right sidebar visibility. Active state: icon highlighted. |
| Bottom Panel Toggle | Icon button | Panel-bottom icon. Toggles bottom panel visibility. Active state: icon highlighted. |

---

### 1.3 Left Sidebar (240px, collapsible to 36px icon mode)

**Structure**: Two tabs at top (tab bar height 36px), content area below.

#### Tab 1: Widget Palette

**Tab label**: Puzzle-piece icon + "Widgets" (icon-only in collapsed mode).

**Categories** (collapsible accordion, default: all expanded):

**Containers** (category header: `#45475a` background, 28px height, 12px bold text):
- **Frame**: `tk.Frame` — Rectangular container with optional border and relief. Used for grouping related controls visually.
- **Grid Container**: Custom logical container. Manages child widget layout via tkinter `grid()` geometry manager. Configurable rows/columns, padding, sticky options. Visualized on canvas with faint dotted border and row/column gutter lines.
- **LabelFrame**: `tk.LabelFrame` — Bordered frame with a text label at the top-left corner. Used for titled sections.
- **Notebook**: `ttk.Notebook` — Tabbed container. Each tab is a child page container. On canvas: shows tab bar with tab labels; clicking a tab switches the visible child page in the editor.
- **PanedWindow**: `tk.PanedWindow` — Resizable split container (horizontal or vertical). Shows a draggable sash between panes.

**Basic Widgets**:
- **Label**: `tk.Label` — Static or dynamic text display. Configurable font, color, alignment, wrap length.
- **Button**: `tk.Button` — Clickable command trigger. Configurable text, command callback, default/active/disabled states.
- **Entry**: `tk.Entry` — Single-line text input. Configurable width, justify, show char (for passwords), state (normal/disabled/readonly).
- **Text**: `tk.Text` — Multi-line text input/display. Configurable width, height, wrap mode, scrollbar association.
- **Checkbutton**: `tk.Checkbutton` — Boolean toggle with label. Configurable variable binding, on/off values.
- **Radiobutton**: `tk.Radiobutton` — Mutually exclusive selection. Part of a variable group. Configurable value, label.
- **Scale (H)**: `tk.Scale` — Horizontal numeric slider. Configurable from, to, resolution, tick interval, orient.
- **Scale (V)**: `tk.Scale` — Vertical numeric slider. Same config as horizontal.
- **Listbox**: `tk.Listbox` — Scrollable list of items. Configurable select mode (single/multiple/extended/browse), height, list items.
- **Combobox**: `ttk.Combobox` — Dropdown selection with optional editable text. Configurable values, state (readonly/normal), width.
- **Spinbox**: `tk.Spinbox` — Numeric/text entry with up/down arrows. Configurable from, to, increment, values list.
- **Progressbar**: `ttk.Progressbar` — Horizontal or vertical progress indicator. Configurable mode (determinate/indeterminate), maximum, variable binding.
- **Canvas**: `tk.Canvas` — Drawing surface for shapes, lines, images. Configurable width, height, background color, scroll region.
- **Separator (H/V)**: `ttk.Separator` — Visual divider line. Orientation only.

**Lab Widgets** (specialized for instrumentation):
- **Serial Monitor**: Composite widget — Text area for serial I/O + Entry for command input + Send button. Configurable baud rate, port, line ending. Displays as a pre-styled group on canvas.
- **Instrument Readout**: Composite widget — Large numeric display with units label, status indicator dot, and optional min/max display. Designed for multimeter/oscilloscope readings. Configurable decimal places, unit suffix, color thresholds.
- **Plot Canvas**: Composite widget — Embedded matplotlib `FigureCanvasTkAgg` placeholder. Configurable axes, title, line colors, update interval. Shows as a rectangle with "Plot" label and axis ticks schematic.
- **Data Logger**: Composite widget — Status display showing logging state (active/paused/stopped), file path, record count, elapsed time. Controls: Start, Stop, Pause buttons. Configurable log format (CSV/JSON), interval, max file size.
- **Alarm Indicator**: Composite widget — Visual alarm with configurable trigger condition, severity levels (info/warning/critical), flash animation, and associated action. Displays as a colored LED-style circle + label.

**Palette Item Rendering**: Each item is a 56px tall row: 20px icon (centered) + label text (12px). Drag initiated on mousedown → creates a ghost element following cursor → drop on canvas creates widget at drop position.

**Search/filter**: At top of palette, a 28px search input filters widget list in real-time. Placeholder: "Search widgets...". Matches against widget name and category.

#### Tab 2: Template Gallery

**Tab label**: Layout-grid icon + "Templates".

**Template cards** (grid layout, 2 columns, 8px gap):
- **Multimeter Readout**: Thumbnail + title + description. Pre-placed: Instrument Readout (large), Label ("Voltage"), Label (units), Button ("Hold"), Status indicator.
- **Serial Monitor**: Pre-placed: Serial Monitor widget (full-width), Button ("Connect"), Button ("Clear"), Checkbutton ("Auto-scroll").
- **Data Logger**: Pre-placed: Data Logger widget, Plot Canvas, Label (status), Button ("Start Logging").
- **Calibration UI**: Pre-placed: Labels (step titles), Entries (reference values), Buttons ("Next Step", "Abort"), Progressbar (overall progress), Label (current error).
- **Oscilloscope Display**: Pre-placed: Plot Canvas (large, dual trace), Labels (CH1/CH2), Scale (timebase), Scale (voltage/div), Button ("Trigger"), Button ("Single").
- **PID Controller Panel**: Pre-placed: 3x Scale (P/I/D), Label (setpoint + actual), Entry (setpoint), Button ("Auto/Manual"), Plot Canvas.
- **Empty Project**: Blank canvas with default 800x600 window size.

**Template card spec**: 108px wide, 80px tall. Contains: 80px thumbnail area (generated from template preview image), 20px title below. Hover: border highlights to `#89b4fa`. Click: loads template, replacing current project (with unsaved-changes confirmation if applicable).

---

### 1.4 Center Canvas

**The canvas is the primary design surface where all widget placement and manipulation occurs.**

#### 1.4.1 Visual Structure

- **Background**: `#1e1e2e` (dark slate).
- **Grid overlay**: Dotted grid at snap interval (default 8px). Dot color: `#313244`, 1px. Faded further at zoom levels < 50%.
- **Window boundary rectangle**: Dashed line (`#585b70`, 2px, 8px dash) showing the tkinter root window dimensions. Default 800x600, editable via Properties panel when nothing selected. Resize handles on this rectangle adjust window size.
- **Origin markers**: Small "X" and "Y" labels at (0,0) with 1px axis lines extending 20px in each direction, color `#585b70`.
- **Rulers** (optional, default OFF): Top and left edge rulers showing pixel coordinates. Toggle in View menu. Background `#11111b`, text `#6c7086`, tick marks every 50px with labels every 100px.

#### 1.4.2 Coordinate System

- **Canvas space**: Infinite 2D plane. The visible viewport is a rectangular region into this plane.
- **Widget coordinates**: All widgets stored as `(x, y, width, height)` in canvas pixels, where (0,0) = top-left of the tkinter root window.
- **Negative coordinates**: Allowed. Widgets with negative coordinates are rendered outside the window boundary rectangle (they will be clipped at runtime). Visual indicator: a muted overlay area outside the window bounds.
- **Coordinate display**: Bottom-right of canvas shows current mouse coordinates in format "X: 142  Y: 280" in 11px `#6c7086` text.

#### 1.4.3 Zoom and Pan

**Zoom**:
- Range: 25% to 300%, default 100%.
- Zoom origin: Mouse cursor position (zoom towards/away from cursor, not center).
- Ctrl + mouse wheel: zoom in/out by 10% increments.
- Zoom is a CSS `transform: scale()` on the canvas content layer, not a re-render.
- At zoom < 50%, widget label text is hidden (only outlines shown). At zoom < 25%, widget icons shown instead of outlines.
- Zoom level persisted per project (saved in IR metadata).

**Pan**:
- Middle-mouse drag: pan canvas in any direction.
- Spacebar + drag: same as middle-mouse (cursor changes to grab/grabbing).
- Scrollbars appear when canvas content extends beyond viewport. Auto-hide scrollbars when content fits.
- Canvas viewport position persisted per project.

#### 1.4.4 Selection System

**Single select**: Click on a widget. Selection indicated by:
- 8 resize handles (6x6px squares, `#89b4fa` fill, 1px `#b4befe` border) at corners and midpoints.
- 1px `#89b4fa` dashed bounding box around the widget.
- Widget name label displayed above the top-left handle (10px text, `#89b4fa`).

**Multi-select**:
- Ctrl+click: toggle individual widget selection.
- Shift+click: add to selection.
- Marquee selection: Click and drag on empty canvas area creates a selection rectangle. All widgets whose bounding box intersects the rectangle are selected. Marquee fill: `rgba(137, 180, 250, 0.1)`, stroke: `#89b4fa` 1px dashed.
- Selected widgets (beyond the first) show simplified handles: 4 corner handles only, no name labels.

**Selection indicators for multi-select**:
- All selected widgets get the 1px dashed `#89b4fa` bounding box.
- A collective bounding box appears around all selected widgets with resize handles. Resizing the collective box proportionally scales all selected widgets relative to their centers.
- Pressing Escape clears all selections.

**Selection stack order**: Widgets are tested for hit-detection in reverse paint order (topmost first). The Widget Tree panel order reflects z-index.

#### 1.4.5 Drag and Drop

**From palette to canvas**:
1. User mousedown on palette item → ghost element created at cursor (semi-transparent, 50% opacity).
2. Drag over canvas → ghost follows cursor. Canvas highlights as valid drop target (subtle border pulse).
3. Drop on canvas → widget created at drop position. Position snapped to grid if snap enabled. Widget name auto-generated (e.g., "label_1", "button_2") with collision numbering.
4. Widget immediately enters edit mode if text-based (label/button/entry), with inline text editing.

**Within canvas (move)**:
1. Mousedown on selected widget (not on handle) → widget(s) attached to cursor.
2. Drag → widgets move with cursor. Real-time snap-to-grid applied if enabled. Smart guides appear when widget aligns with edges/centers of other widgets (1px `#f9e2af` dashed line extending to canvas edge).
3. Drop → position committed. If moved > 4px, creates an undo entry.

**Within canvas (resize)**:
1. Mousedown on resize handle → resize mode.
2. Drag → widget resizes from that handle. Opposite handle stays fixed. Real-time size display tooltip near cursor ("W: 120  H: 80").
3. Shift+drag: maintain aspect ratio.
4. Drop → size committed. Creates undo entry.

#### 1.4.6 Snap-to-Grid and Smart Guides

**Grid snap** (when enabled):
- Widget position (x, y) snaps to nearest grid multiple.
- Widget size (w, h) snaps to nearest grid multiple.
- Resize handles snap the corresponding edge.
- Snap is computed as: `snapped = round(value / grid_size) * grid_size`.

**Smart guides** (always active, independent of grid snap):
- When dragging/moving, check alignment against all other widgets.
- Detect: left edge, horizontal center, right edge, top edge, vertical center, bottom edge.
- Tolerance: 4px.
- Visual: 1px `#f9e2af` (yellow) dashed line from the aligned edge to the matching widget's edge, extending across the canvas.
- Label at intersection: offset value in 10px text (e.g., "Δ: 0").

#### 1.4.7 Inline Editing

Double-click on a Label or Button widget enters inline text edit mode:
- Widget's text becomes an editable `<input>` or `<textarea>` overlaid at the widget's position.
- Font matches widget's configured font. Background: `#313244`, border: 1px `#89b4fa`.
- Enter or blur commits. Escape cancels.
- While in inline edit, all canvas shortcuts are disabled.

#### 1.4.8 Context Menu

Right-click on canvas (empty area) shows:
- Paste (disabled if clipboard empty)
- Select All
- Snap to Grid → submenu: 4px, 8px, 16px, 32px
- Show Grid
- Show Rulers
- Fit to Window
- Zoom → submenu: 50%, 75%, 100%, 125%, 150%, 200%

Right-click on a widget shows:
- Cut / Copy / Paste
- Duplicate
- Delete
- Lock / Unlock
- Hide / Show
- Bring to Front / Send to Back / Bring Forward / Send Backward
- Group (if multiple selected) / Ungroup
- Rename...
- Edit Text... (for text widgets)

---

### 1.5 Right Sidebar (280px, tabbed)

Four tabs. The active tab persists per project. Default active tab: Properties.

#### Tab 1: Properties Panel

**Contextual — content changes based on selection.**

**No selection state**: Shows window-level properties:
- Window Title: text input (default "tkinter GUI")
- Window Size: W × H inputs (default 800 × 600)
- Window Position: X × Y inputs (default center on screen)
- Resizable: two checkboxes (width, height) (default both checked)
- Background Color: color picker
- Icon: file path input (optional .ico/.png)

**Single widget selected**: Shows all properties for that widget type. Organized into collapsible sections:

*Section: Geometry* (always first, expanded by default)
- X, Y, Width, Height — numeric inputs with up/down arrows (step: 1px). Ctrl+click on arrows: step 10px.
- Lock aspect ratio toggle (appears for widgets where it makes sense).
- Anchor point selector: 3x3 grid of dots. Selected dot indicates which corner/center is the "anchor" for X,Y reference. Default: top-left.

*Section: Layout* (for widgets inside Grid Containers)
- Row, Column — numeric inputs
- Rowspan, Columnspan — numeric inputs (default 1)
- Sticky — 3x3 grid of directional toggles (N, S, E, W, NE, NW, SE, SW, CENTER)
- Padx, Pady — numeric inputs
- Weight (row/column) — numeric inputs for grid resize behavior

*Section: Appearance*
- Text / Label — text input (for widgets with text)
- Font Family — dropdown (system fonts list) + custom font input
- Font Size — numeric input (6–72)
- Font Weight — dropdown: normal, bold
- Font Slant — dropdown: roman, italic
- Text Color — color picker with hex input and preset palette
- Background Color — color picker with "transparent" option (uses parent bg)
- Border Width — numeric input
- Relief — dropdown: flat, raised, sunken, groove, ridge, solid
- Cursor — dropdown: arrow, crosshair, hand, text, wait, etc.

*Section: Behavior*
- State — dropdown: normal, active, disabled
- Take Focus — checkbox
- Command — text input for Python function name (e.g., "on_button_click")
- Tab Order — numeric input (for keyboard navigation)

*Section: Data Binding* (shown when state variables or instruments exist)
- Bind to Variable — dropdown of defined state variables + "None"
- Bind to Instrument — dropdown of defined instruments + channel selector + "None"
- Transform — text input for Python expression (e.g., `"value * 1000"` for mV display)

*Widget-specific sections*:
- **Entry**: Show char (for passwords), Justify, Export selection
- **Scale**: From, To, Resolution, Tick interval, Orient, Length, Show value
- **Listbox**: Select mode, List items (multi-line text editor, one per line), Active index
- **Combobox**: Values (multi-line), State (readonly/normal)
- **Spinbox**: From, To, Increment, Values
- **Progressbar**: Mode (determinate/indeterminate), Maximum, Variable
- **Checkbutton**: On value, Off value, Indicator
- **Radiobutton**: Value (within group), Indicator
- **Notebook**: Tab labels list, Active tab index
- **Frame/LabelFrame**: Border width already in Appearance
- **Canvas**: Scroll region, Scrollbars (auto/x/y/none)
- **Instrument Readout**: Decimal places, Unit suffix, Color thresholds (JSON: `{"normal": "#00ff00", "warning": "#ffff00", "critical": "#ff0000"}`), Min/Max display toggle
- **Serial Monitor**: Default baud rate, Default port, Line ending (CR/LF/CRLF/None), Local echo toggle
- **Plot Canvas**: X label, Y label, Title, Line colors (comma-separated), Y min, Y max, Update interval (ms), Number of points
- **Data Logger**: Log format (CSV/JSON), Interval (ms), Max file size (MB), Auto-start toggle, Timestamp format
- **Alarm Indicator**: Condition (Python expression), Severity, Flash interval (ms), Sound toggle, Log message template

**Multiple widgets selected**: Shows only shared/common properties. Values show "—" (mixed) when widgets have different values for the same property. Changing a property applies to all selected widgets.
- Geometry: X, Y (relative offset mode), Width, Height
- Appearance: Font Family, Font Size, Text Color, Background Color (if applicable to all selected types)
- A banner at top: "3 widgets selected" with "Clear selection" link.

**Property input types**:
| Type | UI Component | Validation |
|------|-------------|------------|
| Integer | Number input with +/- buttons | Min/max bounds per property. Red border on invalid. |
| Float | Number input, allows decimals | 2 decimal places default. |
| String | Text input | Max length per property. |
| Text (multi-line) | Auto-expanding textarea | Max 4096 chars. |
| Color | Color swatch (20px square) + hex input | Live preview on change. Validates hex format. Preset palette row below. |
| Dropdown | Select with search | Filterable dropdown. |
| Boolean | Toggle switch | 32px wide switch. |
| JSON/Object | Textarea with format validation | Validate on blur. Show error state if invalid JSON. |
| Expression | Text input with "{ }" button | For Python expressions. Button inserts template. |

#### Tab 2: Widget Tree / Layers Panel

**Always visible. Shows hierarchical tree of all widgets.**

- **Tree structure**: Indentation-based, with expand/collapse chevrons for container widgets (Frame, LabelFrame, Notebook, Grid Container, PanedWindow). Notebook pages shown as child nodes.
- **Row per widget**: Eye icon (visibility toggle) + Lock icon (lock toggle) + Widget type icon (16px) + Widget name (editable on click/double-click) + Widget type label in muted text.
- **Visibility toggle**: Eye-open = visible, eye-crossed = hidden on canvas (widget renders as ghosted outline at 20% opacity). Hidden widgets are excluded from generated code.
- **Lock toggle**: Lock-closed = locked (cannot select or move on canvas). Lock-open = unlocked. Locked widgets show a small lock badge on canvas.
- **Reorder**: Drag and drop rows to reorder. Reordering changes z-index (paint order). Widgets later in the list paint on top.
- **Reparenting**: Drag a widget onto a container in the tree to reparent it. Visual indicator during drag: container highlights when hovered.
- **Multi-select**: Ctrl+click rows. Context menu on right-click: same as canvas context menu plus "Create Group" and "Sort by Name/Type/Position".
- **Search/filter**: Input at top filters tree in real-time.
- **Empty state**: "No widgets yet. Drag widgets from the palette to get started." with an arrow graphic pointing to the left sidebar.

#### Tab 3: State Variables Panel

**Panel for defining tkinter variable bindings (StringVar, IntVar, DoubleVar, BooleanVar).**

- **Add Variable button**: "+ Add Variable" at top. Opens State Variable Editor modal.
- **Variable list**: Each row shows:
  - Variable name (monospace, e.g., `voltage_reading`)
  - Type badge: `str`, `int`, `float`, `bool` (colored: blue, green, orange, purple)
  - Default value (truncated to 20 chars)
  - Bind count badge (number of widget properties bound to this variable)
  - Edit (pencil) and Delete (trash) icons
- **Expandable detail**: Click row to expand and see: bound widgets list (clickable, navigates to widget), current value display (in preview mode).
- **Empty state**: "No state variables defined. Variables let widgets share data automatically." with "+ Add Variable" prominent button.
- **Validation**: Names must be valid Python identifiers (regex: `^[a-zA-Z_][a-zA-Z0-9_]*$`). Duplicate names rejected with inline error.

#### Tab 4: Instruments Panel

**Panel for defining instrument connections (VISA, Serial).**

- **Add Instrument button**: "+ Add Instrument" at top. Opens Instrument Config modal.
- **Instrument list**: Each row shows:
  - Instrument name (user-defined, e.g., "DMM-34401A")
  - Type badge: `VISA`, `SERIAL`, `MOCK` (for testing without hardware)
  - Connection string (truncated, e.g., "ASRL1::INSTR", "COM3:9600")
  - Status indicator: gray (not connected), green (connected in preview), red (error)
  - Expand chevron
- **Expanded detail**: Click to expand and see:
  - Command definitions table: Name | Send String | Parse Expression | Test button
  - Polling configuration: Interval, Enabled toggle
  - Bound widgets list
  - Edit and Delete actions
- **Test connection button**: Per-instrument. Sends an identity query (`*IDN?` for VISA) and displays response in a toast.
- **Empty state**: "No instruments configured. Add instruments to bind widgets to real hardware." with "+ Add Instrument" button.

---

### 1.6 Bottom Panel (collapsible, max-height 300px)

**Toggle**: Via header button or Ctrl+` (backtick).

#### Tab 1: Live Code Panel

**Shows the generated tkinter Python code in real-time.**

- **Read-only** code display with syntax highlighting (Python grammar).
- **Auto-scroll to relevant section**: When a widget is selected on canvas, the code panel auto-scrolls to highlight the code block for that widget.
- **Line numbers**: Displayed in gutter.
- **Copy button**: "Copy All" at top right. Copies entire generated code to clipboard.
- **Word wrap toggle**: Button at top right.
- **Update behavior**: Debounced 500ms after any property change. "Updating..." indicator (small spinner) during regeneration.
- **Syntax validation indicator**: Green checkmark if generated code passes AST parse, red X with error tooltip if not.
- **Empty project state**: Shows a comment block with instructions: `# Create widgets on the canvas to see generated code here.`

#### Tab 2: Event Log Panel

**Shows application events and user actions.**

- **Log entries**: Timestamp | Level (INFO/WARN/ERROR) | Message
- **Filter buttons**: All, Info, Warnings, Errors
- **Clear button**: Clears log
- **Persistent**: Log survives for the session. Max 1000 entries, oldest discarded.
- **Example entries**:
  - `14:32:05  INFO  Widget 'button_1' created at (120, 80)`
  - `14:32:18  INFO  Property 'text' changed on 'label_2': "Voltage" → "Current"`
  - `14:33:02  WARN  Export failed: network error`
- **Auto-scroll**: Always scrolls to bottom on new entry. User can scroll up to pause auto-scroll; "Jump to bottom" button appears when new entries arrive while scrolled up.

---

### 1.7 Modals and Overlays

#### New Project Modal

**Trigger**: File > New or Ctrl+N.
- **Title**: "New Project"
- **Content**: Template gallery grid (same as left sidebar Template tab, but larger cards: 160x120px). "Empty Project" is first.
- **Recent projects**: Below templates, a "Recent Projects" list with names and "Open" links.
- **Actions**: "Create" (primary, disabled until template selected) + "Cancel".
- **Unsaved changes guard**: If current project has unsaved changes, show confirmation dialog: "You have unsaved changes. Save before creating a new project?" [Save] [Don't Save] [Cancel].

#### Export Options Modal

**Trigger**: Export button in header or Ctrl+E.
- **Title**: "Export Python Code"
- **Content**:
  - Output filename: text input, default `{project_name}.py`
  - Code style: radio group — "Single file (flat)" / "Class-based (OOP)"
  - Include docstrings: checkbox (default ON)
  - Include type hints: checkbox (default OFF)
  - Include instrument initialization: checkbox (default ON, disabled if no instruments)
  - Include data logging: checkbox (default ON, disabled if no data loggers)
  - Minimize imports: checkbox (default OFF) — removes unused tkinter imports
  - Preview pane: Below options, a scrollable 15-line preview of the generated code (read-only, syntax highlighted).
- **Actions**: "Export .py" (downloads file) + "Copy to Clipboard" + "Close".
- **Post-export**: Toast notification: "Exported to multimeter_gui.py" with "Open folder" link (where applicable).

#### Instrument Configuration Modal

**Trigger**: "+ Add Instrument" in Instruments panel, or edit existing instrument.
- **Title**: "Configure Instrument" (or "Edit Instrument: {name}")
- **Tabs**: Connection | Commands | Polling

*Connection tab*:
- Instrument Name: text input (required, Python-identifier valid)
- Instrument Type: radio group — VISA / Serial / Mock (for testing)
- **VISA fields** (conditional):
  - Resource String: text input (e.g., "GPIB0::22::INSTR", "ASRL1::INSTR", "TCPIP::192.168.1.100::INSTR"). Dropdown of common patterns + custom.
  - Backend: dropdown — "pyvisa-py" (default), "NI-VISA" (if detected)
  - Timeout (ms): number input, default 5000
- **Serial fields** (conditional):
  - Port: text input (e.g., "COM3", "/dev/ttyUSB0"). Auto-detect button scans available ports.
  - Baud Rate: dropdown — 9600 (default), 115200, 57600, 38400, 19200, 4800, 2400 + custom
  - Data Bits: dropdown — 8 (default), 7, 6, 5
  - Parity: dropdown — None (default), Even, Odd, Mark, Space
  - Stop Bits: dropdown — 1 (default), 1.5, 2
  - Flow Control: dropdown — None (default), XON/XOFF, RTS/CTS, DSR/DTR
- **Mock fields** (conditional):
  - Simulation Mode: dropdown — "Sine wave", "Random noise", "Step function", "Custom sequence"
  - Update interval (ms): number input, default 1000
  - Amplitude/Range: number inputs (mode-dependent)

*Commands tab*:
- Table of command definitions. Columns: Name | Send String | Parse Expression | Description | Test
- "+ Add Command" button adds a row.
- Name: command identifier (e.g., "read_voltage", "set_range")
- Send String: text sent to instrument (e.g., "MEAS:VOLT:DC?\\n"). Note: `\\n` shown as escape sequence.
- Parse Expression: Python expression to parse response (e.g., `float(response.strip())`, `response.strip().split(',')[0]`). Evaluated with `response` variable containing raw instrument return string.
- Test button: sends command using configured connection and displays raw response + parsed value in a popup.
- Edit/Delete per row.

*Polling tab*:
- Enable polling: toggle
- Interval (ms): number input, min 50, default 500
- Poll commands: multi-select from defined commands
- On error: dropdown — "Log and continue" (default), "Stop polling", "Retry 3x then stop"

- **Actions**: "Save" + "Test Connection" + "Cancel".

#### State Variable Editor Modal

**Trigger**: "+ Add Variable" in State panel, or edit existing variable.
- **Title**: "Add State Variable" / "Edit State Variable"
- **Fields**:
  - Variable Name: text input (required, Python-identifier regex validation)
  - Type: dropdown — String (`tk.StringVar`), Integer (`tk.IntVar`), Double (`tk.DoubleVar`), Boolean (`tk.BooleanVar`)
  - Default Value: input type adapts to selected type (text/number/toggle)
  - Format String: text input, optional (e.g., `"%.4f V"` for Double, used for display formatting)
  - Description: textarea, optional (for documentation)
- **Preview area**: Shows generated tkinter variable code snippet.
- **Actions**: "Save" + "Cancel".
- **Validation**: Real-time validation on name field. Error shown inline if invalid or duplicate.

#### Template Save/Load Modal

**Trigger**: File > Save as Template or File > Load Template.
- **Save tab**: Template name input, description textarea, tags input (comma-separated), "Include instruments config" checkbox. "Save" stores to browser localStorage.
- **Load tab**: Grid of saved templates + built-in templates. Search/filter bar. "Load" replaces current project (with unsaved-changes guard). "Delete" (for user-saved only).
- User templates stored in browser `localStorage` under key `labgui_templates_v1`.
- Max 20 user templates. Toast warning on attempt to exceed.

#### Settings Modal

**Trigger**: Gear icon in header.
- **Tabs**: General | Canvas | Code Generation | Account

*General*:
- Theme: dropdown — Dark (default), Light, High Contrast
- Language: dropdown — English (default)
- Auto-save: toggle + interval input (seconds, default 30)
- Confirm destructive actions: toggle (default ON)
- Default window size for new projects: W × H inputs

*Canvas*:
- Default snap-to-grid: toggle (default ON)
- Default grid size: dropdown — 4, 8 (default), 16, 32
- Default show grid: toggle (default ON)
- Smart guides: toggle (default ON)
- Nudge amount (arrow keys): number input, default 1px
- Shift-nudge amount: number input, default 10px

*Code Generation*:
- Default export style: radio — Flat / Class-based
- Default include docstrings: toggle
- Default include type hints: toggle
- Shebang line: toggle (default OFF) — `#!/usr/bin/env python3`
- Encoding declaration: toggle (default ON) — `# -*- coding: utf-8 -*-

*Account* (future placeholder):
- Sign in / Sign up buttons (for cloud sync, deferred)

---

## 2. Feature Matrix

### Legend
- **P0**: Must-have for MVP. Blocking for first release.
- **P1**: Important. Should be in initial release if time permits.
- **P2**: Nice-to-have. Can ship without. Follow-up iteration.

---

### 2.1 Canvas Operations

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 1.1 | Canvas Rendering | P0 | The main design surface renders all widgets at their specified (x,y,w,h) positions with correct visual styling. | As a user, I need to see my GUI laid out visually so I can design by direct manipulation. | All widgets render at correct positions. Widgets inside containers render relative to parent. Z-order respected (later in list = on top). Canvas background color applied. |
| 1.2 | Pan | P0 | User can pan the canvas view in any direction to navigate the design surface. | As a user, I need to pan around to view different parts of my layout, especially when it exceeds screen size. | Middle-mouse drag pans canvas. Spacebar+drag also pans. Cursor changes to grab/grabbing. Canvas scrollbars update position. Pan position persisted per project. |
| 1.3 | Zoom | P0 | User can zoom in/out of the canvas from 25% to 300%. | As a user, I need to zoom for precise placement and to see the overall layout. | Ctrl+mousewheel zooms 10% increments. Zoom dropdown in header works. Zoom origin at cursor position. Min 25%, max 300%. Zoom level displayed in header. Zoom persisted per project. |
| 1.4 | Snap-to-Grid | P0 | Widget positions and sizes snap to a configurable grid interval. | As a user, I want widgets to align neatly without manual pixel-perfect positioning. | Grid visible as dots. Widget x,y,w,h snap to nearest grid multiple on drag/resize/create. Grid size configurable (4/8/16/32). Toggle on/off. Default: ON, 8px. |
| 1.5 | Smart Guides | P1 | Alignment guides appear when dragging widgets near edges/centers of other widgets. | As a user, I want visual feedback when widgets align with each other for professional-looking layouts. | 1px yellow dashed lines appear when widget edges/centers align within 4px tolerance. Guides extend across canvas. Delta label shown at intersection. Works during drag and resize. |
| 1.6 | Marquee Selection | P0 | Click-drag on empty canvas creates a selection rectangle; widgets intersecting it are selected. | As a user, I need to select multiple widgets quickly for batch operations. | Marquee renders as blue dashed rectangle. All widgets whose bounding box intersects marquee become selected on mouseup. Shift+marquee adds to existing selection. Ctrl+marquee toggles intersection set. |
| 1.7 | Multi-Select | P0 | Select multiple widgets using Ctrl+click, Shift+click, and marquee selection. | As a user, I need to operate on multiple widgets at once (move, delete, property change). | Ctrl+click toggles individual selection. Shift+click adds range (in z-order). Selected widgets show selection handles. Properties panel shows shared properties. Collective bounding box appears. |
| 1.8 | Widget Drag (Move) | P0 | Selected widget(s) can be dragged to new positions on canvas. | As a user, I need to reposition widgets by direct manipulation. | Mousedown on widget body initiates drag. Widget follows cursor. Snap-to-grid and smart guides active during drag. Multi-selected widgets move together maintaining relative positions. Drop commits position. Undo entry created if moved > 4px. |
| 1.9 | Widget Resize | P0 | Selected widgets can be resized via 8 drag handles. | As a user, I need to adjust widget dimensions visually. | 8 handles appear on selected widget (6x6px). Each handle resizes from that edge/corner. Opposite handle fixed. Real-time size tooltip. Shift+resize maintains aspect ratio. Snap-to-grid on resize. Undo entry created. |
| 1.10 | Inline Text Edit | P1 | Double-click on text widgets enables direct text editing overlaid on canvas. | As a user, I want to quickly edit labels and button text without using the side panel. | Double-click enters edit mode. Input overlaid at widget position with matching font. Enter/Blur commits. Escape cancels. Canvas shortcuts disabled during edit. |
| 1.11 | Canvas Context Menu | P1 | Right-click on canvas shows contextual actions. | As a user, I want quick access to common actions without navigating menus. | Right-click on empty area: paste, select all, view options. Right-click on widget: cut, copy, paste, duplicate, delete, lock, hide, z-order, group, rename. Menu appears within 16px of cursor. |
| 1.12 | Window Boundary | P0 | A dashed rectangle shows the tkinter root window bounds. | As a user, I need to know where my GUI window edges are so I can design within bounds. | Dashed rectangle at window size (default 800x600). Resize handles on rectangle adjust window size. Title bar rendered above rectangle. Widgets outside boundary shown with muted overlay. |
| 1.13 | Coordinate Display | P1 | Current mouse coordinates shown at bottom-right of canvas. | As a user, I want to know exact pixel positions for precise placement. | X and Y values update in real-time as mouse moves. Format: "X: 142  Y: 280". Font 11px, color `#6c7086`. Positioned at bottom-right with 8px padding. |
| 1.14 | Rulers | P2 | Optional top and left edge rulers with pixel markings. | As a user, I want ruler guides for precise alignment, especially for large layouts. | Toggle via View menu or header. Top ruler: horizontal marks every 10px, labels every 100px. Left ruler: vertical marks. Background `#11111b`, text `#6c7086`. Scroll with canvas. |

---

### 2.2 Widget Management

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 2.1 | Add Widget | P0 | Widgets can be added to the canvas by dragging from the palette or clicking (then clicking on canvas). | As a user, I need to populate my GUI with widgets. | Drag from palette to canvas creates widget at drop position. Click palette item then click canvas: widget created at click position. Widget name auto-generated with unique suffix. Widget immediately selected. |
| 2.2 | Delete Widget | P0 | Selected widget(s) can be deleted. | As a user, I need to remove widgets I no longer want. | Delete key removes selected widget(s). Context menu "Delete" works. Confirmation modal shown for >3 widgets or container with children. Widget removed from canvas and IR. Undo available. |
| 2.3 | Duplicate Widget | P0 | Create a copy of selected widget(s) offset by (10, 10) pixels. | As a user, I want to quickly create similar widgets. | Ctrl+D duplicates selected widget(s). Duplicated widget name gets "_copy" suffix (auto-incremented if collision). Position offset +10,+10 from original. All properties copied. Duplicated widget selected. Undo available. |
| 2.4 | Copy/Paste | P0 | Copy selected widget(s) to clipboard and paste elsewhere. | As a user, I want to copy widgets between projects and positions. | Ctrl+C copies selected widget(s) to clipboard (JSON serialization). Ctrl+V pastes at mouse position or offset from original. Clipboard persists across browser sessions (localStorage). Cross-project paste works. Pasted widget gets unique name. |
| 2.5 | Cut | P0 | Cut selected widget(s) to clipboard (removes from canvas). | As a user, I want to move widgets via clipboard. | Ctrl+X cuts selected widget(s). Widgets removed from canvas. Can be pasted elsewhere. Undo restores cut widgets. |
| 2.6 | Group/Ungroup | P1 | Group selected widgets into a logical unit that can be moved/resized together. | As a user, I want to group related widgets so I can manipulate them as a unit. | Ctrl+G groups selected widgets. Group appears as a bounding box with "Group" label. Group can be moved/resized as unit. Resize proportionally scales children. Ctrl+Shift+G ungroups. Groups nestable (group within group, max depth 3). Groups shown in Widget Tree. |
| 2.7 | Lock Widget | P1 | Lock a widget to prevent accidental selection or modification. | As a user, I want to lock finished parts of my layout so I don't accidentally change them. | Lock toggle in Widget Tree and context menu. Locked widget: cannot select on canvas, cannot move/resize. Visual indicator: small lock badge. Lock state saved in IR. |
| 2.8 | Hide Widget | P1 | Hide a widget from the canvas view (and generated code). | As a user, I want to temporarily hide widgets I'm not working on to reduce clutter. | Hide toggle in Widget Tree. Hidden widget: ghosted at 20% opacity on canvas, not included in generated code. Hidden widgets excluded from selection. Toggle restores visibility. |
| 2.9 | Z-Order Control | P1 | Change the stacking order of widgets. | As a user, I need to control which widgets appear on top of others. | "Bring to Front", "Send to Back", "Bring Forward", "Send Backward" in context menu. Changes order in Widget Tree. Later in tree = higher z-index. Visual update immediate. |
| 2.10 | Widget Rename | P1 | Rename a widget via the Widget Tree or context menu. | As a user, I want meaningful names for my widgets so the generated code is readable. | Double-click name in Widget Tree enters edit. Context menu "Rename..." opens input. Name validated: Python identifier, unique in project. All references updated (bindings, commands). |
| 2.11 | Widget Reparent | P1 | Move a widget into or out of a container (Frame, Grid Container, etc.). | As a user, I need to reorganize my widget hierarchy. | Drag in Widget Tree to reparent. Drag on canvas onto container reparents. Visual feedback during drag (container highlights). Coordinates adjust relative to new parent. |
| 2.12 | Widget Search | P2 | Search for widgets by name or type. | As a user with many widgets, I need to quickly find specific widgets. | Search input in Widget Tree filters in real-time. Matches name or type. Cleared with X button. Selected widget from search is scrolled into view and highlighted. |

---

### 2.3 Properties Editing

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 3.1 | Geometry Properties | P0 | Edit X, Y, Width, Height for all widgets. | As a user, I need precise control over widget placement and size. | Numeric inputs with +/- buttons. Step 1px (Ctrl+click: 10px). Min values: X/Y can be negative, W/H min 1px. Validation: red border on invalid. Changes reflected on canvas in real-time. |
| 3.2 | Text Properties | P0 | Edit text content, font, size, color for text-bearing widgets. | As a user, I need to customize the text appearance of my widgets. | Text input for content. Font family dropdown (system fonts). Size 6–72px. Weight normal/bold. Slant normal/italic. Color picker with hex input + preset palette. Live preview on canvas. |
| 3.3 | Color Properties | P0 | Edit foreground (text) and background colors. | As a user, I want to customize colors for visual design and lab conventions. | Color swatch + hex input per color property. 16-color preset palette below picker. "Transparent" option for background (inherits parent). Recent colors row (last 8). Live preview. |
| 3.4 | Layout Properties (Grid Container) | P0 | Configure grid row, column, rowspan, columnspan, sticky, padding for children of Grid Containers. | As a user, I need to control how widgets arrange inside grid containers. | Row/Column numeric inputs. Rowspan/Columnspan min 1. Sticky: 3x3 directional grid (toggles for N,S,E,W,CENTER). Padx/Pady numeric. Weight numeric for resize behavior. Visual grid overlay in container on canvas. |
| 3.5 | Appearance Properties | P0 | Edit border width, relief, cursor style. | As a user, I want to control the visual styling details. | Border width: 0–10px. Relief: dropdown (flat, raised, sunken, groove, ridge, solid). Cursor: dropdown with icon preview (arrow, crosshair, hand, etc.). |
| 3.6 | Behavior Properties | P0 | Edit widget state, focus behavior, command callbacks. | As a user, I need to configure how widgets behave at runtime. | State: normal/active/disabled dropdown. Take focus: checkbox. Command: text input for Python function name (validated as valid identifier). Tab order: numeric. |
| 3.7 | Widget-Specific Properties | P0 | All type-specific properties are editable. | As a user, I need to configure each widget type's unique settings. | Scale: from/to/resolution/tick. Listbox: items list, select mode. Combobox: values, state. Checkbutton: on/off values. Each widget type shows only its relevant properties. See §1.5 Tab 1 for full list. |
| 3.8 | Data Binding Properties | P0 | Bind widget properties to state variables or instrument readings. | As a user, I want widgets to automatically update from instruments or shared state. | Dropdown of defined variables/instruments per bindable property. "None" unbinds. Transform expression input. Validation: only compatible types shown (e.g., BooleanVar for Checkbutton). Generated code uses `widget.config(variable=...)` or `widget.config(textvariable=...)`. |
| 3.9 | Multi-Edit Properties | P1 | Edit shared properties of multiple selected widgets simultaneously. | As a user, I want to change properties for several widgets at once. | Properties panel shows intersection of shared properties. Mixed values shown as "—". Changing applies to all selected. Geometry shows relative offset mode. Banner shows selection count. |
| 3.10 | Property Validation | P0 | Validate property inputs and prevent invalid values. | As a user, I want to be prevented from entering invalid values that would break my GUI. | Real-time validation. Red border + tooltip on invalid. Invalid values not committed to IR. Numeric fields reject non-numeric. Name fields validate Python identifiers. Required fields prevent empty. |
| 3.11 | Property Undo | P0 | Property changes are undoable. | As a user, I want to revert property changes I didn't intend. | Each property change creates an undo entry. Ctrl+Z reverts. Coalesced: rapid changes to same property within 500ms collapse into single undo entry. |
| 3.12 | Window-Level Properties | P0 | Edit top-level window properties when no widget selected. | As a user, I need to configure the main application window. | Title, size, position, resizable flags, background color, icon. Position supports "center" keyword. Changes reflected in window boundary rectangle. |

---

### 2.4 Undo/Redo System

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 4.1 | Command Pattern | P0 | All mutating operations use the Command pattern for undoable actions. | As a user, I expect reliable undo/redo for all my changes. | Every mutating operation wraps in a Command object with `execute()` and `undo()` methods. Commands pushed to undo stack. Redo stack cleared on new command. Max undo depth: 200 commands. |
| 4.2 | Coalesced Operations | P0 | Rapid repeated operations (drag, resize) collapse into single undo entry. | As a user, I don't want undo to step through every pixel of a drag operation. | Drag operations: start position recorded on mousedown, end position on mouseup. Single undo entry for the entire drag. Same for resize. Coalescing window: 500ms for property changes. |
| 4.3 | Undo Stack Visualization | P2 | Visual indication of undo stack depth or recent operations. | As a user, I want to understand what will be undone. | Dropdown next to undo button showing last 10 operation descriptions. Clicking an entry undoes to that point. Format: "Moved label_1", "Changed text on button_2", "Deleted 3 widgets". |
| 4.4 | Persistent Undo | P2 | Undo stack persists across browser sessions for the same project. | As a user, I want undo to work even if I close and reopen the browser. | Undo stack serialized to localStorage with project. Restored on project open. Max 50KB serialized stack (discard oldest if exceeded). |

---

### 2.5 Clipboard

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 5.1 | Internal Clipboard | P0 | Copy/cut/paste widgets within the same project. | As a user, I want to duplicate and rearrange widgets within my project. | Ctrl+C/X/V work. Clipboard stores widget JSON. Paste at mouse position or +20,+20 from original. Unique names auto-generated on paste. Relative positions within groups preserved. |
| 5.2 | Cross-Project Clipboard | P1 | Paste widgets copied from a different project. | As a user, I want to reuse widgets across different projects. | Clipboard stored in localStorage (key: `labgui_clipboard_v1`). Available across browser tabs and sessions. Pasted widgets adapt to target project (name collisions resolved). Instrument bindings cleared if instruments don't exist in target. |
| 5.3 | Clipboard Persistence | P1 | Clipboard survives page refresh. | As a user, I don't want to lose my clipboard on accidental refresh. | Stored in localStorage. Survives browser restart. Expires after 7 days (timestamp stored, cleared on load if expired). |

---

### 2.6 Project Management

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 6.1 | New Project | P0 | Create a new project from scratch or template. | As a user, I want to start a new GUI design. | File > New or Ctrl+N opens New Project modal. Template selection or empty. Unsaved-changes guard shown if applicable. New IR created with default values. |
| 6.2 | Open Project | P0 | Open a previously saved `.gui.json` file. | As a user, I need to continue working on existing projects. | File > Open or Ctrl+O opens file picker (`.gui.json` filter). File loaded and validated against schema. Invalid file shows error toast with details. Recent projects list in New Project modal. |
| 6.3 | Save Project | P0 | Save current project as `.gui.json` file. | As a user, I need to save my work. | Ctrl+S downloads `.gui.json` file. Filename: `{project_name}.gui.json`. Auto-save optional (every 30s, to localStorage backup). Save status indicator in header. |
| 6.4 | Save As | P0 | Save with a different filename. | As a user, I want to create a copy of my project with a new name. | File > Save As opens filename input. Default: current name + "_copy". Saves and updates project name in header. |
| 6.5 | Auto-Save | P1 | Automatically save project to browser storage at intervals. | As a user, I don't want to lose work from crashes or accidental closure. | Toggle in settings. Interval configurable (default 30s). Saves to localStorage under key `labgui_autosave_{project_id}`. Toast on first auto-save. "Restore auto-save?" prompt on reopening tool if auto-save exists. Max 10 auto-saved projects (LRU eviction). |
| 6.6 | Export to .py | P0 | Generate and download a standalone Python tkinter file. | As a user, I need runnable Python code from my design. | Ctrl+E opens Export modal. Generated code is valid Python 3.8+. Single file output. Includes all widget definitions. Includes instrument code if configured. Includes data logging code if configured. Code commented with widget names. |
| 6.7 | Project Validation | P0 | Validate project IR before export and flag issues. | As a user, I want to know if my design has problems before exporting. | Pre-export validation checks: widget name uniqueness, valid Python identifiers, no orphaned bindings, no infinite alarm loops, required fields filled. Issues shown in Event Log panel with severity. Export blocked on critical errors (bypassable with warning). |
| 6.8 | Recent Projects | P1 | Track and display recently opened projects. | As a user, I want quick access to my recent work. | Last 10 projects tracked in localStorage. Shown in New Project modal. Display name + last opened date. Click to open (with file picker if not in localStorage). |

---

### 2.7 Run Preview

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 7.1 | Generate Preview Code | P0 | Generate temporary Python file for preview. | As a user, I want to see how my GUI looks and behaves before finalizing. | "Run Preview" button generates .py file. Code includes all widgets with current properties. Code includes mock instrument data if instruments configured but not connected. Generated to browser memory (Blob). |
| 7.2 | Download Preview | P0 | Download the generated preview file. | As a user, I need the preview file to run locally. | File auto-downloaded as `{project_name}_preview.py`. Browser download API used. Download progress shown briefly. Filename includes timestamp if duplicate. |
| 7.3 | Preview Instructions | P1 | Show instructions for running the preview file. | As a user, I need to know how to run the preview file on my system. | Post-download overlay/toast: "Downloaded! Run with: `python {filename}`". "Copy command" button. Link to Python setup guide for first-time users. Collapsible panel with: requirements (tkinter comes with Python), how to install pyvisa-py if using VISA, how to install pyserial if using serial. |
| 7.4 | Preview Feedback Loop | P1 | User can return to editor after preview and continue editing. | As a user, I want to iterate quickly between editing and previewing. | Browser stays on editor. Download is the only action. User can click "Run Preview" again at any time to regenerate. Toast: "Preview updated and downloaded" on subsequent clicks. |

---

### 2.8 Widget Tree / Layers

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 8.1 | Hierarchical Tree View | P0 | Display all widgets in a tree structure reflecting parent-child relationships. | As a user, I need to understand and navigate my widget hierarchy. | Tree shows all widgets. Indentation for nesting. Expand/collapse for containers. Notebook tabs shown as children. Drag to reorder. Click to select (syncs with canvas). |
| 8.2 | Tree Reorder (Z-Index) | P0 | Drag widgets in the tree to change z-order. | As a user, I want to control which widgets appear on top. | Drag row to new position. Drop indicator line shows insertion point. Order change reflected on canvas immediately. Later in list = higher z-index. |
| 8.3 | Visibility Toggle | P1 | Toggle widget visibility from the tree. | As a user, I want to hide widgets without deleting them. | Eye icon per row. Toggle show/hide. Hidden: eye-crossed icon, ghosted on canvas. Excluded from generated code. State persisted. |
| 8.4 | Lock Toggle | P1 | Toggle widget lock from the tree. | As a user, I want to prevent accidental modification of finished widgets. | Lock icon per row. Toggle locked/unlocked. Locked: lock-closed icon, widget unselectable on canvas. State persisted. |
| 8.5 | Tree-C Canvas Sync | P0 | Selection syncs between tree and canvas bidirectionally. | As a user, I want selection to be consistent across the UI. | Click widget on canvas → tree scrolls to and highlights it. Click widget in tree → canvas selects and scrolls to it. Multi-select syncs both directions. |
| 8.6 | Widget Rename in Tree | P1 | Rename widgets inline in the tree. | As a user, I want to give widgets meaningful names. | Double-click name → inline edit. Enter commits, Escape cancels. Validates Python identifier and uniqueness. All references updated. |
| 8.7 | Tree Search/Filter | P2 | Filter the widget tree. | As a user with complex UIs, I need to find widgets quickly. | Search input at top of panel. Real-time filter. Matches name or type. Clear button. Empty state when no matches. |

---

### 2.9 Templates

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 9.1 | Built-in Templates | P0 | Pre-built templates for common lab GUI patterns. | As a user, I want to start from a proven layout rather than from scratch. | 7 built-in templates: Multimeter Readout, Serial Monitor, Data Logger, Calibration UI, Oscilloscope Display, PID Controller Panel, Empty Project. Each loads a complete .gui.json IR. Templates include realistic default property values. |
| 9.2 | Template Gallery UI | P0 | Visual gallery for browsing and selecting templates. | As a user, I want to see what each template looks like before choosing. | Grid of template cards with thumbnail, title, description. Hover highlights card. Click selects (border changes). "Create" button loads selected. Available in New Project modal and left sidebar Templates tab. |
| 9.3 | User-Saved Templates | P1 | Save current project as a reusable template. | As a user, I want to reuse my own project patterns. | File > Save as Template. Name, description, tags inputs. Stored in localStorage. Max 20 user templates. Appears in gallery under "My Templates" section. Deletable. |
| 9.4 | Template Preview | P1 | Show a larger preview of the template before loading. | As a user, I want to examine a template more closely before committing. | "Preview" button on template card. Opens modal with full-size canvas render of template (read-only). "Use This Template" and "Close" buttons. |

---

### 2.10 Grid Container Widget

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 10.1 | Grid Container Creation | P0 | Create a container that manages children using tkinter grid() layout. | As a user, I want structured layouts (forms, dashboards) without manual pixel positioning. | Available in Widget Palette under Containers. Dropped on canvas shows container with configurable rows/columns. Default: 2x2 grid. |
| 10.2 | Grid Configuration | P0 | Configure rows, columns, padding for the grid. | As a user, I need to control the grid structure. | Properties: Rows (1–20), Columns (1–20), Row padding (px), Column padding (px), Uniform row height toggle, Uniform column width toggle. Grid lines visible on canvas (dotted `#45475a`). |
| 10.3 | Child Placement | P0 | Drop widgets into grid cells. | As a user, I want to place widgets into specific grid cells. | Drag widget onto container → snaps to nearest cell. Visual highlight of target cell during drag. Widget position stored as (row, column) in IR, not (x,y). Widget rendered at computed position on canvas. |
| 10.4 | Row/Column Span | P0 | Widgets can span multiple rows and/or columns. | As a user, I want widgets to occupy multiple cells (e.g., a full-width button). | Properties: Rowspan (1 to remaining rows), Columnspan (1 to remaining columns). Visualized on canvas with merged cell highlight. |
| 10.5 | Sticky Configuration | P0 | Control how widgets expand within their cells. | As a user, I want widgets to fill their cells appropriately. | 3x3 sticky grid toggle (N,S,E,W,CENTER). Multiple directions allowed. Visual indicator on widget: arrows showing sticky directions. |
| 10.6 | Grid Weight/Resize | P1 | Configure row/column weights for proportional resizing. | As a user, I want my grid layout to respond to window resizing. | Per-row weight input. Per-column weight input. Higher weight = more expansion. Weight visualization: subtle bar chart in grid header/footer. |
| 10.7 | Grid-to-Canvas Coexistence | P0 | Absolute and grid layouts work together on the same design. | As a user, I want a mix of free-positioned and grid-managed widgets. | Absolute-positioned widgets outside Grid Containers unchanged. Grid Container itself is absolutely positioned (x,y,w,h). Children positions computed from grid layout. Generated code: grid container uses `.grid()`, other widgets use `.place()`. |
| 10.8 | Grid Code Generation | P0 | Generated code uses tkinter grid() for Grid Container children. | As a user, I want the generated code to use proper grid layout. | Container widget uses `widget.grid(row=..., column=..., rowspan=..., columnspan=..., sticky=..., padx=..., pady=...)`. Grid configuration set via `grid_rowconfigure()` and `grid_columnconfigure()`. |

---

### 2.11 Instrument Binding

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 11.1 | Instrument Definition | P0 | Define instrument connections (VISA, Serial, Mock). | As a user, I want to connect my GUI to real lab instruments. | Instrument config modal with name, type, connection parameters. VISA: resource string, backend, timeout. Serial: port, baud, data bits, parity, stop bits, flow control. Mock: simulation mode, interval. |
| 11.2 | Command Definition | P0 | Define SCPI/serial commands for reading/writing instrument data. | As a user, I want to define the specific commands my instrument understands. | Per-instrument command table: name, send string, parse expression. Test button sends command and shows raw + parsed response. Commands stored in IR. |
| 11.3 | Widget Binding | P0 | Bind widget properties to instrument command results. | As a user, I want widgets to display live instrument data. | Properties panel shows "Bind to Instrument" dropdown. Select instrument → select command → optional transform expression. Generated code: creates polling thread, updates widget via `root.after()`. |
| 11.4 | Polling Configuration | P0 | Configure how often to poll instrument data. | As a user, I need to control update frequency for performance. | Per-instrument polling: enable toggle, interval (ms, min 50), command selection. Error handling: log/continue, stop, retry. |
| 11.5 | Mock Instrument Mode | P1 | Simulate instrument data without hardware for development. | As a user, I want to develop and test my GUI without connected hardware. | Mock instrument type generates synthetic data. Modes: sine wave, random noise, step function, custom sequence. Configurable amplitude, frequency, offset. Generated code includes mock data generator function. |
| 11.6 | Connection Test | P1 | Test instrument connectivity from the config dialog. | As a user, I want to verify my connection settings work before exporting. | "Test Connection" button sends `*IDN?` (VISA) or configured test command (Serial). Displays response or error in dialog. Timeout handling. |
| 11.7 | VISA Backend Support | P0 | Support pyvisa-py backend for VISA instruments. | As a user with GPIB/USB/ethernet instruments, I need VISA communication. | Generated code imports `pyvisa`. Creates `rm = pyvisa.ResourceManager()`. Opens resource with configured string. Includes error handling. |
| 11.8 | Serial Backend Support | P0 | Support pyserial for RS-232/Serial instruments. | As a user with serial-connected instruments, I need serial communication. | Generated code imports `serial`. Opens port with configured parameters. Handles read/write with configured line endings. Includes timeout and exception handling. |

---

### 2.12 State Variables

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 12.1 | Variable Creation | P0 | Create tkinter variable objects (StringVar, IntVar, DoubleVar, BooleanVar). | As a user, I want widgets to share data and update automatically. | State Variable Editor modal. Name (Python identifier), type dropdown, default value, optional format string. Preview of generated code. |
| 12.2 | Variable Binding | P0 | Bind widget properties to state variables. | As a user, I want widget properties to be controlled by variables. | Properties panel "Bind to Variable" dropdown. Only compatible types shown. Binds to appropriate tkinter config option (`textvariable`, `variable`, etc.). Generated code creates var and links widget. |
| 12.3 | Variable Types | P0 | Support all four tkinter variable types. | As a user, I need different variable types for different data. | StringVar (str), IntVar (int), DoubleVar (float), BooleanVar (bool). Type badge color-coded in panel. |
| 12.4 | Format String | P1 | Apply display formatting to numeric variables. | As a user, I want formatted display (e.g., "5.2341 V" instead of "5.23412345"). | Format string input per variable (e.g., `"%.4f V"`). Applied in generated code via wrapper function. Only applicable to numeric types. |
| 12.5 | Variable Editing | P0 | Edit existing variables. | As a user, I need to change variable definitions. | Pencil icon in variable list opens edit modal. All fields editable. Validation: cannot change type if bindings exist (must unbind first). Name change updates all references. |
| 12.6 | Variable Deletion | P0 | Remove variables from the project. | As a user, I want to clean up unused variables. | Trash icon in variable list. Confirmation if bindings exist. Option to "Remove bindings and delete" or "Cancel". Cascading delete of bindings. |
| 12.7 | Transform Expression | P1 | Apply Python expressions to variable values before display. | As a user, I want to transform values (e.g., convert volts to millivolts). | Expression input in binding config. Evaluated with `value` variable. Example: `value * 1000`, `f"{value:.2f} mV"`. Validation: syntax check on input. |

---

### 2.13 Data Logging

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 13.1 | Data Logger Widget | P1 | Composite widget for logging data to file. | As a user, I want to log instrument readings for later analysis. | Available in Lab Widgets palette. Shows: status (stopped/recording/paused), file path, record count, elapsed time. Controls: Start, Stop, Pause buttons. |
| 13.2 | Log Source Selection | P1 | Select which variables/instruments to log. | As a user, I need to choose what data gets logged. | Configuration: multi-select checklist of state variables and instrument commands. Source name, type, current value preview. |
| 13.3 | Log Format | P1 | Choose output format for log file. | As a user, I want my data in a usable format. | Dropdown: CSV (default), JSON Lines. CSV: configurable delimiter (comma, tab, semicolon), header row toggle. JSON: one object per line. |
| 13.4 | Log Interval | P1 | Configure how often to write log entries. | As a user, I need to balance data resolution vs. file size. | Numeric input (ms), min 100, default 1000. Independent from instrument polling interval. |
| 13.5 | File Management | P1 | Configure log file path, rotation, and size limits. | As a user, I want controlled log file growth. | File path input (default: `./data_log_{timestamp}.csv`). Max file size (MB, default 100). Rotation: stop, overwrite, or rotate to new file. |
| 13.6 | Log Code Generation | P1 | Generated code includes data logging thread. | As a user, I want the exported code to handle logging automatically. | Generated: logging thread function, file I/O with locking, timestamp generation, rotation logic. Thread started on logger start, stopped on logger stop. |

---

### 2.14 Alarms

| # | Feature | Priority | Description | User Story | Acceptance Criteria |
|---|---------|----------|-------------|------------|---------------------|
| 14.1 | Alarm Definition | P1 | Define alarm conditions on state variables or instrument readings. | As a user, I want to be alerted when values exceed safe ranges. | Alarm config: trigger condition (Python expression, e.g., `temperature > 80.0`), severity (info/warning/critical), source variable/instrument. |
| 14.2 | Alarm Actions | P1 | Configure what happens when alarm triggers. | As a user, I want visible and loggable alarm notifications. | Actions: flash widget color (configurable), show popup message, log to console/file, play sound (deferred). Multiple actions per alarm. |
| 14.3 | Alarm Indicator Widget | P1 | Visual widget showing alarm state. | As a user, I want a clear visual indicator of alarm status. | LED-style circle (green=ok, yellow=warning, red=critical). Label for alarm name. Optional flash animation on trigger. Configurable colors per severity. |
| 14.4 | Alarm Code Generation | P1 | Generated code includes alarm checking logic. | As a user, I want alarms to work in the exported code. | Generated: alarm checker function (runs in polling loop), condition evaluation, action execution. Thread-safe widget updates via `root.after()`. |

---

## 3. User Flows

### Flow A: First-Time User Builds a Multimeter Readout GUI

**Goal**: A new user opens the tool for the first time and builds a working multimeter GUI from a template.

**Preconditions**: User has the webapp URL. Browser is modern (Chrome/Firefox/Edge). No prior projects.

| Step | Actor | Action | System Response | UI State |
|------|-------|--------|-----------------|----------|
| 1 | User | Navigates to webapp URL | App loads, shows splash screen for 1.5s then transitions to New Project modal | New Project modal visible with template gallery |
| 2 | User | Views template gallery | Gallery shows 7 template cards in 2-column grid | Template cards rendered with thumbnails. "Empty Project" is first. |
| 3 | User | Clicks on "Multimeter Readout" template card | Card gets blue selection border. "Create" button enables | "Multimeter Readout" selected. Create button active. |
| 4 | User | Clicks "Create" button | Modal closes. Canvas loads template. Toast: "Multimeter Readout template loaded" | Canvas shows: InstrumentReadout (large, center), Label "Voltage" (top-left), Label "V DC" (top-right), Button "Hold" (bottom), status indicator dot. Left sidebar shows Widget Palette. Right sidebar shows Properties panel. |
| 5 | User | Clicks on InstrumentReadout widget on canvas | Widget selected, 8 handles appear. Properties panel updates | Properties panel shows InstrumentReadout-specific properties. Geometry section expanded. |
| 6 | User | Drags InstrumentReadout to center canvas | Widget moves with cursor. Smart guides appear when aligned. Snap-to-grid active. Drops at new position. | Widget repositioned. Undo stack: "Moved instrument_readout_1". Event log entry created. |
| 7 | User | Clicks on "Voltage" Label | Label selected. Properties panel updates. | Properties panel shows Label properties. Text field shows "Voltage". |
| 8 | User | Edits Text field in Properties panel to "Voltage (DC)" | Label text updates in real-time on canvas. | Canvas label shows "Voltage (DC)". Event log: "Changed text on label_1". |
| 9 | User | Clicks "Hold" Button | Button selected. | Properties panel shows Button properties. Command field shows default function name. |
| 10 | User | Edits Command field to "on_hold_toggle" | Command updated in IR. | Button command property updated. |
| 11 | User | Clicks "Run Preview" button in header | System generates preview .py, triggers browser download | Download starts. Toast: "Preview downloaded: multimeter_readout_preview.py. Run with: `python multimeter_readout_preview.py`". Copy command button visible. |
| 12 | User | Clicks "Copy command" button | Command copied to clipboard | Clipboard contains command. Toast: "Copied to clipboard". |
| 13 | User | Opens terminal, runs the .py file | tkinter window opens showing the multimeter GUI | User sees GUI running locally. (Outside system scope) |
| 14 | User | Returns to browser | Editor state preserved | All edits intact. Auto-save may have fired. |
| 15 | User | Adjusts widget positions further | Canvas updates | Changes tracked in undo stack. |
| 16 | User | Presses Ctrl+E | Export modal opens | Export options visible. Preview pane shows generated code. |
| 17 | User | Reviews export options, clicks "Export .py" | File downloaded as `multimeter_readout.py` | Toast: "Exported to multimeter_readout.py". |

**Postconditions**: User has a working multimeter readout GUI exported as Python file.

**Error paths**:
- Step 11: If generation fails → toast: "Preview generation failed: {error}". Event log shows details.
- Step 13: If user doesn't have Python → instructions panel shows Python download link.

---

### Flow B: Adding Instrument Binding

**Goal**: User adds a VISA instrument connection and binds a widget to live data.

**Preconditions**: User has a project open with a Label widget for voltage display. Instrument (e.g., Keysight 34401A) is connected via GPIB.

| Step | Actor | Action | System Response | UI State |
|------|-------|--------|-----------------|----------|
| 1 | User | Clicks "Instruments" tab in right sidebar | Instruments panel becomes active | Panel shows: "No instruments configured" message, "+ Add Instrument" button. |
| 2 | User | Clicks "+ Add Instrument" button | Instrument Configuration modal opens, Connection tab active | Modal with Name input, Type radio (VISA/SERIAL/MOCK), VISA fields visible by default. |
| 3 | User | Enters "DMM_34401A" in Name field | Name validated (green checkmark) | Name field shows valid state. |
| 4 | User | Selects "VISA" type | VISA-specific fields shown | Resource String input, Backend dropdown, Timeout input visible. |
| 5 | User | Enters "GPIB0::22::INSTR" in Resource String | Input accepted | Resource string stored. |
| 6 | User | Clicks "Commands" tab | Commands tab becomes active | Empty command table with "+ Add Command" button. |
| 7 | User | Clicks "+ Add Command" | New command row added to table | Empty row with editable fields: Name, Send String, Parse Expression. |
| 8 | User | Fills command: Name="read_voltage", Send="MEAS:VOLT:DC?\\n", Parse="float(response.strip())" | Fields populated. | Command row complete. |
| 9 | User | Clicks "Test" button for read_voltage command | System attempts connection, sends command | If successful: popup shows "Raw: +1.23456E+00\\n" and "Parsed: 1.23456". If failed: error message with details. |
| 10 | User | Clicks "Polling" tab | Polling config shown | Enable toggle, Interval input, Command selection. |
| 11 | User | Enables polling, sets interval to 500ms, selects "read_voltage" command | Polling configured | Toggle ON. Interval: 500. |
| 12 | User | Clicks "Save" button | Modal closes. Instrument appears in Instruments panel. | Panel shows: "DMM_34401A" row, type badge "VISA", connection string, status gray. |
| 13 | User | Clicks on voltage Label widget on canvas | Label selected, Properties panel shows Label properties | Properties panel visible with all Label properties. |
| 14 | User | Scrolls to "Data Binding" section in Properties panel | Binding controls visible | "Bind to Instrument" dropdown visible. |
| 15 | User | Clicks "Bind to Instrument" dropdown | Dropdown shows available instruments: "DMM_34401A" | Instrument listed. |
| 16 | User | Selects "DMM_34401A" | Second dropdown appears: command selection | Command dropdown shows: "read_voltage". |
| 17 | User | Selects "read_voltage" command | Command bound. Transform expression input appears. | Binding established. |
| 18 | User | Enters transform: `"%.6f V" % value` in Transform field | Transform expression saved | Transform stored. |
| 19 | User | Clicks elsewhere / presses Enter | Binding committed to IR | Label now bound to instrument. Canvas shows small "linked" badge on Label. Event log: "Bound label_2.text to DMM_34401A.read_voltage". |
| 20 | User | Clicks "Run Preview" | Preview code generated with instrument polling | Downloaded code includes: pyvisa import, connection setup, polling thread, `root.after()` updates. |

**Postconditions**: Voltage Label is bound to live instrument data. Generated code includes full instrument communication.

**Error paths**:
- Step 9: Connection test fails → modal stays open, error shown inline. User can still save (will generate code that handles connection errors gracefully).
- Step 15: No instruments defined → dropdown shows "No instruments. Add one in the Instruments panel." with link.

---

### Flow C: Creating a State Variable and Binding Widgets

**Goal**: User creates state variables and binds multiple widget properties to them for reactive UI behavior.

**Preconditions**: User has a project with a Button ("Start") and a Label ("Status: Stopped").

| Step | Actor | Action | System Response | UI State |
|------|-------|--------|-----------------|----------|
| 1 | User | Clicks "State Variables" tab in right sidebar | State Variables panel becomes active | Panel shows: "No state variables defined" message, "+ Add Variable" button. |
| 2 | User | Clicks "+ Add Variable" button | State Variable Editor modal opens | Modal with: Name input, Type dropdown, Default Value input, Format String input, Description textarea. |
| 3 | User | Enters "running" in Name field | Name validated in real-time | Green checkmark if valid Python identifier, unique. |
| 4 | User | Selects "Boolean" from Type dropdown | Default Value input changes to toggle switch | Toggle switch shown, default OFF. |
| 5 | User | Leaves default as false (OFF) | Default value set | BooleanVar default: False. |
| 6 | User | Clicks "Save" | Modal closes. Variable appears in State Variables panel. | Panel shows: `running` with `bool` badge (purple), default "False", bind count "0". |
| 7 | User | Clicks "+ Add Variable" again | State Variable Editor modal opens | Modal ready for second variable. |
| 8 | User | Creates "voltage" variable: Name="voltage", Type="Double", Default=0.0, Format="%.4f V" | Variable created and saved | Panel now shows both variables. `voltage` has `float` badge (orange), default "0.0", format "%.4f V". |
| 9 | User | Clicks on "Start" Button on canvas | Button selected, Properties panel updates | Properties panel shows Button properties. |
| 10 | User | Scrolls to "Data Binding" section | Binding controls visible | "Bind to Variable" dropdown visible. |
| 11 | User | Clicks "Bind to Variable" dropdown for the Button's `enabled` property | Dropdown shows compatible variables | Shows: `running` (Boolean, compatible). `voltage` (Double, incompatible - grayed out with note). |
| 12 | User | Selects "running" | Variable bound to enabled property | Binding saved. Transform field appears. |
| 13 | User | Enters transform: `"not running"` → corrected to: `"not value"` in Transform field | Transform expression saved | Expression validated: `not value` is valid Python with `value` variable. |
| 14 | User | Clicks on "Status" Label on canvas | Label selected | Properties panel shows Label properties. |
| 15 | User | Binds Label's `text` property to `voltage` variable | Binding created | Label bound. Format string "%.4f V" applied automatically. Canvas shows small "linked" badge. |
| 16 | User | Clicks "Run Preview" | Code generated with variable bindings | Generated code includes: `running = tk.BooleanVar(value=False)`, `voltage = tk.DoubleVar(value=0.0)`, `start_button.config(state=tk.NORMAL if not running.get() else tk.DISABLED)`, `status_label.config(textvariable=voltage)` with format wrapper. |
| 17 | User | Runs the .py file locally | GUI opens | Start button is enabled (running=False). Status label shows "0.0000 V". (Note: voltage display via textvariable with format requires a wrapper — generated code includes `format_func`). |

**Postconditions**: Button enabled state inversely bound to `running`. Label text bound to formatted `voltage`. Generated code uses tkinter variables.

**Error paths**:
- Step 3: Name "running status" (with space) → red border, tooltip: "Must be a valid Python identifier (no spaces, start with letter/underscore)".
- Step 11: Attempt to bind DoubleVar to Boolean property → incompatible types warning, binding allowed but flagged in Event Log.

---

### Flow D: Setting up Data Logging and Alarms

**Goal**: User configures automatic data logging and temperature alarm.

**Preconditions**: User has a project with state variables `voltage` (Double) and `temperature` (Double), both bound to instrument readings.

| Step | Actor | Action | System Response | UI State |
|------|-------|--------|-----------------|----------|
| 1 | User | Opens Widget Palette, finds "Data Logger" in Lab Widgets | Data Logger widget highlighted in palette | Palette scrolled to Lab Widgets section. |
| 2 | User | Drags Data Logger onto canvas | Data Logger widget created at drop position | Widget appears on canvas with: status "Stopped", file path blank, record count "0", elapsed "00:00:00". Buttons: Start, Stop, Pause (grayed). |
| 3 | User | Selects Data Logger widget | Properties panel shows Data Logger properties | Properties: Log format (CSV), Interval (1000ms), Max file size (100MB), Auto-start (OFF). |
| 4 | User | Configures log sources | Multi-select shows available variables | Source list: `voltage` (Double), `temperature` (Double). User checks both. |
| 5 | User | Sets log format to CSV, interval to 1000ms, max file to 100MB | Properties updated | Config saved to IR. |
| 6 | User | Opens Widget Palette, drags "Alarm Indicator" onto canvas | Alarm Indicator created | LED circle shows green. Label "Alarm". |
| 7 | User | Selects Alarm Indicator | Properties panel shows alarm properties | Properties: Condition, Severity, Actions. |
| 8 | User | Configures alarm: Condition="temperature > 80.0", Severity="critical" | Condition validated (syntax check) | Expression parsed successfully. Green indicator. |
| 9 | User | Configures actions: Flash widget red (selects alarm indicator itself), Log message="Temperature alarm: {value}°C exceeded 80°C" | Actions configured | Two actions listed. |
| 10 | User | Clicks "Run Preview" | Code generated | Generated code includes: DataLogger class with threading, file I/O, CSV writing. Alarm checker function with condition eval, action execution. Thread-safe widget updates. |
| 11 | User | Runs .py locally, temperature exceeds 80°C | Alarm triggers | Alarm indicator flashes red. Console log shows alarm message. Data file written with timestamp, voltage, temperature columns. |

**Postconditions**: Data logging active with CSV output. Temperature alarm configured with visual and log actions.

**Error paths**:
- Step 8: Invalid condition syntax → red border, tooltip: "Invalid Python expression". Parse error details shown.
- Step 4: No state variables defined → source list empty, message: "No state variables. Create variables in the State panel first."

---

### Flow E: Using Grid Container for a Form Layout

**Goal**: User creates a structured form using Grid Container widget.

**Preconditions**: User has a blank project or existing project. No special preconditions.

| Step | Actor | Action | System Response | UI State |
|------|-------|--------|-----------------|----------|
| 1 | User | Opens Widget Palette, clicks "Grid Container" under Containers | Grid Container selected (palette item highlighted) | Cursor changes to crosshair (drop mode). |
| 2 | User | Clicks on canvas | Grid Container created at click position | Container appears as rectangle with 2x2 grid overlay (dotted lines). Properties panel shows Grid Container properties. |
| 3 | User | Sets Rows=3, Columns=2, Row padding=10, Column padding=10 in Properties panel | Grid updates to 3 rows × 2 columns with 10px padding | Canvas shows updated grid: 3 rows, 2 columns, gutter lines at padding boundaries. |
| 4 | User | Drags Label "Name:" from palette, drops in row 0, column 0 | Label snaps to cell (0,0) | Label positioned at computed position for cell (0,0). Properties panel shows Layout section with Row=0, Column=0. |
| 5 | User | Drags Entry widget, drops in row 0, column 1 | Entry snaps to cell (0,1) | Entry positioned in cell (0,1). |
| 6 | User | Drags Label "Email:", drops in row 1, column 0 | Label in cell (1,0) | Label positioned correctly. |
| 7 | User | Drags Entry widget, drops in row 1, column 1 | Entry in cell (1,1) | Entry positioned correctly. |
| 8 | User | Drags Button "Submit", drops in row 2, column 0 | Button in cell (2,0) | Button in cell (2,0). |
| 9 | User | Selects "Submit" Button, sets Columnspan=2 in Properties panel | Button spans both columns in row 2 | Button expands to fill both columns. Visual indicator: merged cell highlight. |
| 10 | User | Sets Sticky to "EW" (East+West) for Submit button | Sticky arrows shown on widget | Button configured to stretch horizontally. |
| 11 | User | Sets Row weight: row 0=0, row 1=0, row 2=0 | Weight values set | No visual change (all equal). |
| 12 | User | Sets Column weight: col 0=0, col 1=1 | Column 1 gets higher weight | Visual indicator: weight bar in column header. |
| 13 | User | Clicks "Run Preview" | Code generated with grid layout | Generated code: `submit_button.grid(row=2, column=0, columnspan=2, sticky='ew', padx=10, pady=10)`. Column 1 configured with `grid_columnconfigure(1, weight=1)`. |
| 14 | User | Runs .py locally, resizes window | Grid responds to resize | Column 1 (Entry column) expands. Submit button stretches full width. Labels stay left-aligned. |

**Postconditions**: 3×2 form layout created with proper grid() code generation.

**Error paths**:
- Step 9: Columnspan=2 in column 1 would exceed bounds → validation error: "Columnspan 2 at column 1 exceeds grid width of 2 columns". Max allowed: 1.
- Step 4: Dropping widget outside container → widget placed as absolute-positioned, not in grid. Toast: "Dropped outside container. Widget placed absolutely. Drag into container to add to grid."

---

## 4. UI Component Specifications

### 4.1 WidgetPalette

**Purpose**: Provide access to all creatable widget types, organized by category.

**Location**: Left sidebar, Widgets tab.

**Data Displayed**:
- Categorized list of all widget types (Containers, Basic Widgets, Lab Widgets)
- Each item: icon (20px), widget name, short description (on hover)
- Category headers with expand/collapse chevrons
- Search/filter input at top

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click category header | Toggle expand/collapse | Chevron rotates 90°. Section animates open/closed (200ms ease). |
| Mousedown on widget item | Initiate drag | Ghost element created (semi-transparent, 80% scale). Follows cursor. |
| Drag over canvas | Prepare for drop | Canvas border pulses subtly (2px `#89b4fa` shadow). |
| Drop on canvas | Create widget | Widget appears at drop position. Animation: scale from 0.8 to 1.0 (150ms ease-out). |
| Click search input | Focus | Cursor appears. Placeholder text "Search widgets..." disappears. |
| Type in search | Filter list | Real-time filtering. Non-matching items hidden. Category headers hidden if all children filtered. "No results" shown if empty. |
| Hover on widget item | Show tooltip | Tooltip appears after 500ms delay: widget name + one-line description. |

**States**:
- **Empty**: N/A (always has widgets)
- **Filtered**: Search active, some items hidden. Clear button (X) in search input.
- **Collapsed**: All categories collapsed. Only headers visible.

**Keyboard Shortcuts**: None specific. Up/Down arrows navigate list items when search focused.

---

### 4.2 Canvas

**Purpose**: Primary design surface for widget placement, positioning, and manipulation.

**Location**: Center of application, fills remaining space between sidebars, header, and footer.

**Data Displayed**:
- All widgets from IR at their (x,y,w,h) positions with configured styles
- Window boundary rectangle (dashed)
- Grid overlay (configurable)
- Selection handles and bounding boxes
- Smart guide lines (during drag)
- Marquee rectangle (during multi-select)
- Origin markers and coordinate display

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click empty area | Deselect all | Selection handles disappear. Properties panel shows window properties. |
| Click widget | Select widget | Widget gets selection handles + dashed bounding box. Widget Tree syncs. Properties panel updates. |
| Ctrl+click widget | Toggle selection | Widget added/removed from selection. Selection indicators update. |
| Mousedown + drag on empty area | Marquee select | Blue dashed rectangle follows drag. Widgets intersecting added to selection on mouseup. |
| Mousedown on widget body | Initiate drag | Widget follows cursor. Smart guides + snap active. Real-time position in tooltip. |
| Mousedown on resize handle | Initiate resize | Widget resizes from that handle. Opposite handle fixed. Size tooltip. Shift maintains aspect ratio. |
| Double-click text widget | Inline edit | Text input overlaid. Font matches widget. Enter commits, Escape cancels. |
| Right-click | Context menu | Menu appears at cursor position. Auto-flips if near edge. |
| Ctrl+mousewheel | Zoom | Canvas scales. Zoom indicator updates. |
| Middle-mouse drag | Pan | Canvas translates. Cursor: grab/grabbing. |
| Spacebar + drag | Pan (alternative) | Same as middle-mouse. Spacebar cursor change. |
| Arrow keys | Nudge selected widget(s) | Widget moves 1px in direction. Shift+Arrow: 10px. Snap applied. |
| Delete key | Delete selected | Widgets removed. Undo available. |

**States**:
- **Empty**: No widgets in project. Shows centered message: "Drag widgets here to start building" with animated arrow pointing to left sidebar.
- **Active**: Widgets present, normal interaction mode.
- **Dragging**: Widget(s) being moved. Smart guides active. Snap active.
- **Resizing**: Widget being resized. Size tooltip active.
- **Marquee selecting**: Marquee rectangle visible.
- **Panning**: Canvas being panned. Cursor: grabbing.
- **Inline editing**: Text input overlaid. Canvas shortcuts disabled.
- **Zoomed**: Zoom level != 100%. Scale indicator shown.

**Keyboard Shortcuts**: See §5 for full list.

---

### 4.3 PropertiesPanel

**Purpose**: Edit all configurable properties of the selected widget(s) or window.

**Location**: Right sidebar, Properties tab (default active).

**Data Displayed**:
- Contextual property sections based on selection state and widget type
- Property values from IR (or "—" for mixed multi-select)
- Validation state per field
- Binding options (variables, instruments)

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click property input | Focus | Input focused, existing value selected. |
| Type in text input | Edit property | Real-time validation. Canvas updates live for visual properties. Debounced undo (500ms). |
| Click color swatch | Open color picker | Color picker dropdown/popover appears with: hue slider, saturation/value square, hex input, preset palette, recent colors. |
| Click dropdown | Open options | Filterable dropdown list. Keyboard navigation supported. |
| Click toggle switch | Toggle boolean | Switch animates (200ms). Property updated immediately. |
| Click +/- on numeric input | Increment/decrement | Value changes by step (1px default, 10px with Ctrl). |
| Click section header | Toggle expand/collapse | Section animates open/closed. Chevron rotates. |
| Click "Bind to Variable" dropdown | Show variables | Dropdown of compatible variables + "None". Incompatible types grayed. |
| Click "Bind to Instrument" dropdown | Show instruments | Dropdown of defined instruments. Selecting reveals command dropdown. |
| Enter transform expression | Set transform | Syntax validated on blur. Green/red border indicator. |

**States**:
- **No selection**: Shows window-level properties (title, size, position, resizable, bg color).
- **Single selected**: Shows all properties for that widget type. Organized in sections.
- **Multi-selected**: Shows shared properties only. Mixed values shown as "—". Banner shows count.
- **Locked widget**: All inputs disabled (grayed). Banner: "This widget is locked. Unlock to edit."
- **Validation error**: Invalid fields show red border + tooltip with error message. Property not committed.

**Keyboard Shortcuts**: Tab cycles through inputs. Shift+Tab reverse. Enter commits text input. Escape cancels inline editing.

---

### 4.4 WidgetTreePanel

**Purpose**: Display and navigate the widget hierarchy. Control visibility, locking, and ordering.

**Location**: Right sidebar, Widget Tree tab.

**Data Displayed**:
- Hierarchical tree: widget name, type icon, visibility icon, lock icon
- Indentation for nesting level
- Expand/collapse chevrons for containers
- Selection state (highlighted row)

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click row | Select widget | Row highlights. Canvas syncs selection. Properties panel updates. |
| Ctrl+click row | Toggle selection | Row added/removed from selection. Multi-select mode. |
| Click eye icon | Toggle visibility | Icon toggles open/crossed. Widget ghosted/hidden on canvas. |
| Click lock icon | Toggle lock | Icon toggles open/closed. Widget unselectable/selectable on canvas. |
| Drag row | Reorder/reparent | Drop indicator line shows insertion point. Container highlight on hover. Drop commits new order/parent. |
| Double-click name | Rename | Inline text input. Enter commits, Escape cancels. Validation. |
| Right-click row | Context menu | Same as canvas context menu + "Sort by Name/Type/Position". |
| Click expand chevron | Toggle children | Chevron rotates. Children animate in/out. |

**States**:
- **Empty**: "No widgets yet" message with instructional graphic.
- **Populated**: Tree with widget rows. Expandable containers.
- **Filtered**: Search active. Non-matching rows hidden. "X results" indicator.
- **Dragging**: Row being dragged. Ghost element follows cursor. Drop zones highlighted.

**Keyboard Shortcuts**: Up/Down arrows navigate rows. Right arrow expands, Left arrow collapses. Delete removes selected. Space toggles selection.

---

### 4.5 StateInspectorPanel

**Purpose**: Define and manage tkinter variable bindings for reactive widget behavior.

**Location**: Right sidebar, State Variables tab.

**Data Displayed**:
- List of defined variables: name, type badge, default value, bind count
- Expandable detail per variable: bound widgets list, current value

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click "+ Add Variable" | Open editor modal | State Variable Editor modal appears. |
| Click expand chevron on row | Show detail | Row expands. Shows bound widgets (clickable links), current value. |
| Click pencil icon | Edit variable | Editor modal opens with pre-filled values. |
| Click trash icon | Delete variable | Confirmation dialog if bindings exist. "Remove bindings and delete" or "Cancel". |
| Click bound widget link | Navigate to widget | Widget selected on canvas. Widget Tree scrolls to it. Properties panel shows it. |

**States**:
- **Empty**: "No state variables defined" message with "+ Add Variable" button.
- **Populated**: Variable list. Rows expandable.
- **Editing**: Modal open. Real-time validation on name field.

**Keyboard Shortcuts**: None.

---

### 4.6 InstrumentsPanel

**Purpose**: Define instrument connections and commands for hardware integration.

**Location**: Right sidebar, Instruments tab.

**Data Displayed**:
- List of defined instruments: name, type badge, connection string, status dot
- Expandable detail: commands table, polling config, bound widgets

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click "+ Add Instrument" | Open config modal | Instrument Configuration modal appears. |
| Click expand chevron | Show instrument detail | Row expands. Shows commands, polling, bindings. |
| Click "Test Connection" | Test connectivity | Spinner appears briefly. Result: green check + response, or red X + error. |
| Click pencil icon | Edit instrument | Config modal opens with pre-filled values. |
| Click trash icon | Delete instrument | Confirmation dialog. Cascading unbind of widget bindings. |

**States**:
- **Empty**: "No instruments configured" message with "+ Add Instrument" button.
- **Populated**: Instrument list. Status indicators: gray (new), green (connected in preview), red (error).
- **Expanded**: Detail visible. Commands table, polling settings.

**Keyboard Shortcuts**: None.

---

### 4.7 CodePanel

**Purpose**: Display generated tkinter Python code in real-time for transparency and debugging.

**Location**: Bottom panel, Code tab.

**Data Displayed**:
- Generated Python code with syntax highlighting
- Line numbers in gutter
- Syntax validation indicator (checkmark / X)
- Current widget code highlighting (when widget selected)

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Scroll | View code | Code scrolls. Line numbers stay synced. |
| Click "Copy All" | Copy to clipboard | Toast: "Code copied to clipboard". |
| Click word wrap toggle | Toggle wrapping | Code reflows. Toggle button state changes. |
| Click line | No action (read-only) | Line highlighted briefly. |
| Select widget on canvas | Auto-scroll to code | Code panel scrolls to relevant section. Widget's code block highlighted with subtle blue background. |

**States**:
- **Empty project**: Comment: `# Create widgets on the canvas to see generated code here.`
- **Populated**: Syntax-highlighted Python code.
- **Updating**: Small spinner in top-right during regeneration (debounced 500ms).
- **Valid**: Green checkmark. Code passes AST parse.
- **Invalid**: Red X. Tooltip shows parse error details.

**Keyboard Shortcuts**: Ctrl+C copies selection. Ctrl+A selects all.

---

### 4.8 TemplateGallery

**Purpose**: Browse and select from built-in and user-saved project templates.

**Location**: Left sidebar Templates tab AND New Project modal.

**Data Displayed**:
- Grid of template cards: thumbnail (80px), title, one-line description
- Built-in templates first, then "My Templates" section
- Search/filter bar (in modal)

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Click template card | Select template | Card gets blue border (2px `#89b4fa`). "Create" button enables. |
| Hover on card | Highlight | Card border changes to `#585b70`. Subtle lift shadow. |
| Click "Create" (modal) or double-click card (sidebar) | Load template | Modal closes (if open). Canvas loads template widgets. Toast: "{Template} loaded". Undo stack reset. |
| Click "Preview" (if available) | Show preview | Modal with full-size read-only canvas render. |

**States**:
- **In modal**: Gallery with Create/Cancel buttons. Selection required to enable Create.
- **In sidebar**: Immediate-load on double-click. No confirmation.
- **Empty user templates**: "My Templates" section hidden if none saved.

**Keyboard Shortcuts**: Escape closes modal. Enter loads selected template.

---

### 4.9 ExportDialog

**Purpose**: Configure and execute export to Python .py file.

**Location**: Modal overlay.

**Data Displayed**:
- Filename input
- Code style options (flat / class-based)
- Checkbox options (docstrings, type hints, instrument init, data logging, minimize imports)
- Live code preview (15 lines, read-only, syntax highlighted)
- Validation status

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Edit filename | Update name | Real-time validation (valid filename). Extension `.py` auto-appended if missing. |
| Toggle checkboxes | Update options | Preview regenerates (debounced 300ms). |
| Click "Export .py" | Download file | Browser download triggered. Modal closes. Toast: "Exported to {filename}". |
| Click "Copy to Clipboard" | Copy code | Entire generated code copied. Toast: "Code copied". |
| Click "Close" | Close modal | Modal closes. No action. |

**States**:
- **Valid**: All checks pass. Export button enabled.
- **Validation warnings**: Non-critical issues (e.g., unused imports). Export button enabled with warning banner.
- **Validation errors**: Critical issues (e.g., syntax error in generated code). Export button disabled. Error details shown.
- **Generating**: Brief spinner while code regenerates after option change.

**Keyboard Shortcuts**: Escape closes. Enter triggers Export if valid.

---

### 4.10 InstrumentConfigDialog

**Purpose**: Configure instrument connection parameters, commands, and polling.

**Location**: Modal overlay.

**Data Displayed**:
- Tabbed interface: Connection | Commands | Polling
- Connection: name, type (VISA/Serial/Mock), type-specific fields
- Commands: editable table (name, send string, parse expression, test button)
- Polling: enable toggle, interval, command selection, error handling

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Change instrument type | Show/hide fields | Conditional fields animate in/out. |
| Click "+ Add Command" | Add command row | Empty row appended to table. |
| Click "Test" on command row | Send test command | Spinner briefly. Popup with raw + parsed response, or error. |
| Click "Test Connection" | Test full connection | Spinner. Result popup with instrument ID response or error. |
| Click "Save" | Save instrument | Modal closes. Instrument added to Instruments panel. Event log entry. |
| Click "Cancel" | Discard changes | Modal closes. No changes saved. |

**States**:
- **New**: Empty form. Connection tab active.
- **Edit**: Pre-filled with existing instrument data.
- **Validating**: Real-time validation on name field (Python identifier, unique). Required field checks.
- **Testing**: Connection/command test in progress. Buttons disabled during test.
- **Test success**: Green result popup.
- **Test failure**: Red error popup with details.

**Keyboard Shortcuts**: Tab navigates fields. Escape cancels. Ctrl+Enter saves.

---

### 4.11 StateVarEditorDialog

**Purpose**: Create or edit a state variable definition.

**Location**: Modal overlay.

**Data Displayed**:
- Name input (with validation)
- Type dropdown (StringVar, IntVar, DoubleVar, BooleanVar)
- Default value input (type-adaptive: text/number/toggle)
- Format string input (optional, for numeric types)
- Description textarea (optional)
- Generated code preview

**User Interactions**:
| Interaction | Action | Feedback |
|-------------|--------|----------|
| Type name | Validate | Real-time: green check if valid Python identifier + unique, red X + tooltip if not. |
| Change type | Adapt default value input | String→text input, Int/Double→number input, Boolean→toggle switch. |
| Edit format string | Update preview | Code preview updates. Example shows formatted output. |
| Click "Save" | Save variable | Modal closes. Variable appears in State panel. Event log entry. |
| Click "Cancel" | Discard | Modal closes. No changes. |

**States**:
- **New**: Empty form. Type default: StringVar.
- **Edit**: Pre-filled. Name field may be disabled if bindings exist (changing name updates references).
- **Valid**: All required fields filled, name valid and unique. Save enabled.
- **Invalid**: Name invalid or duplicate, or required field empty. Save disabled. Error indicators shown.

**Keyboard Shortcuts**: Tab navigates. Escape cancels. Enter saves if valid.

---

## 5. Keyboard Shortcuts & Hotkeys

### Global Shortcuts (work anywhere in the app)

| Shortcut | Action | Context | Priority |
|----------|--------|---------|----------|
| `Ctrl+S` | Save project | Global | P0 |
| `Ctrl+Shift+S` | Save As | Global | P1 |
| `Ctrl+O` | Open project | Global | P0 |
| `Ctrl+N` | New project | Global | P0 |
| `Ctrl+E` | Export .py | Global | P0 |
| `Ctrl+Z` | Undo | Global (unless editing text) | P0 |
| `Ctrl+Y` | Redo | Global (unless editing text) | P0 |
| `Ctrl+Shift+Z` | Redo (alternate) | Global (unless editing text) | P0 |
| `Ctrl+\`` | Toggle bottom panel | Global | P1 |
| `Ctrl+B` | Toggle left sidebar | Global | P1 |
| `Ctrl+Shift+B` | Toggle right sidebar | Global | P1 |
| `Ctrl+/` | Show keyboard shortcuts cheat sheet | Global | P2 |
| `Escape` | Close modal / deselect all / cancel operation | Global | P0 |
| `F1` | Open help/documentation | Global | P2 |

### Canvas Shortcuts (active when canvas focused, not inline editing)

| Shortcut | Action | Details | Priority |
|----------|--------|---------|----------|
| `Delete` | Delete selected widget(s) | Confirmation for >3 items or containers with children | P0 |
| `Ctrl+C` | Copy selected widget(s) | Serialized to clipboard + localStorage | P0 |
| `Ctrl+X` | Cut selected widget(s) | Remove from canvas, add to clipboard | P0 |
| `Ctrl+V` | Paste from clipboard | At mouse position, or +20,+20 from original | P0 |
| `Ctrl+D` | Duplicate selected widget(s) | Offset +10,+10 from original | P0 |
| `Ctrl+A` | Select all widgets | All widgets selected. Collective bounding box. | P0 |
| `Ctrl+G` | Group selected widget(s) | Creates group. Max nesting depth: 3 | P1 |
| `Ctrl+Shift+G` | Ungroup selected group(s) | Children become independent | P1 |
| `↑` `↓` `←` `→` | Nudge selected widget 1px | Directional movement. Snap applied. No undo per nudge; undo for the sequence. | P0 |
| `Shift+↑` etc. | Nudge selected widget 10px | Directional movement. Configurable amount in settings. | P0 |
| `Ctrl+↑` `Ctrl+↓` | Bring Forward / Send Backward | Change z-order by 1 position | P1 |
| `Ctrl+Shift+↑` `Ctrl+Shift+↓` | Bring to Front / Send to Back | Move to top/bottom of z-order | P1 |
| `Ctrl+mousewheel` | Zoom in/out | 10% increments. Origin at cursor. | P0 |
| `Spacebar` + drag | Pan canvas | Alternative to middle-mouse. Cursor: grab/grabbing. | P0 |
| `0` | Zoom to 100% | Resets zoom to 1:1 | P1 |
| `Ctrl+0` | Fit to screen | Zoom so all widgets fit in viewport + 20px padding | P1 |
| `G` | Toggle snap-to-grid | Quick toggle without opening menu | P1 |
| `H` | Toggle grid visibility | Quick toggle | P1 |

### Widget Tree Shortcuts

| Shortcut | Action | Details | Priority |
|----------|--------|---------|----------|
| `↑` `↓` | Navigate rows | Select previous/next widget | P1 |
| `→` | Expand container | If collapsed container selected | P1 |
| `←` | Collapse container | If expanded container selected | P1 |
| `Space` | Toggle selection | On focused row | P1 |
| `F2` | Rename focused widget | Inline name edit | P1 |

### Properties Panel Shortcuts

| Shortcut | Action | Details | Priority |
|----------|--------|---------|----------|
| `Tab` | Next field | Standard form navigation | P0 |
| `Shift+Tab` | Previous field | Reverse navigation | P0 |
| `Enter` | Commit value | For text/number inputs | P0 |
| `Escape` | Cancel edit | Revert to previous value | P0 |

### Modal Shortcuts

| Shortcut | Action | Details | Priority |
|----------|--------|---------|----------|
| `Escape` | Close modal / Cancel | Equivalent to Cancel button | P0 |
| `Enter` | Confirm / Save | Equivalent to primary action button (if valid) | P0 |
| `Tab` | Navigate fields | Standard form navigation | P0 |

---

## 6. Progressive Disclosure Design

The UI surfaces complexity gradually based on user experience level and project state. This prevents overwhelming first-time users while providing full power to experienced users.

### 6.1 First Launch Experience

**Trigger**: User opens tool for the very first time (no localStorage data).

**UI State**:
- **Welcome overlay**: Brief 3-slide onboarding (can be skipped):
  1. "Welcome to LabGUI" — what the tool does, who it's for.
  2. "Design Visually" — drag widgets, edit properties, see live preview.
  3. "Export to Python" — one-click export to runnable tkinter code.
- **New Project modal auto-opens** after onboarding (or immediately if skipped).
- **Template gallery prominently displayed**: Large cards, clear descriptions. "Empty Project" available but not emphasized.
- **Simplified palette**: Only "Basic Widgets" category expanded. Containers and Lab Widgets collapsed.
- **Right sidebar**: Only "Properties" and "Widget Tree" tabs visible. "State Variables" and "Instruments" tabs hidden.
- **Bottom panel**: Collapsed. Code panel hidden.
- **Header**: Full set of controls visible (no reduction needed — they're self-explanatory).

**Transition to next stage**: User selects a template and clicks "Create", OR manually dismisses the welcome and creates an empty project.

### 6.2 First Project Active

**Trigger**: User has created/opened a project and is on the canvas.

**UI State**:
- **Simplified palette**: All categories visible but Lab Widgets collapsed by default.
- **Right sidebar**: "Properties" and "Widget Tree" tabs visible and active. "State Variables" and "Instruments" tabs still hidden.
- **Contextual hints**: First time user drags a widget → toast: "Widget added! Edit its properties in the right panel."
- **First property edit**: Subtle highlight pulse on Properties panel to draw attention.
- **Run Preview button**: Subtle pulse animation after 3rd widget added. Tooltip: "See your GUI in action!"
- **No code panel**: Bottom panel stays collapsed. User focuses on visual design.

**Transition**: User clicks "Run Preview" for the first time, OR adds 5+ widgets, OR has been active for 10+ minutes.

### 6.3 Intermediate User

**Trigger**: User has completed at least one export/preview cycle. Flag stored in localStorage: `labgui_has_exported=true`.

**UI State**:
- **Full palette**: All categories expanded. Lab Widgets visible.
- **All right sidebar tabs visible**: Properties, Widget Tree, State Variables, Instruments.
- **State Variables tab**: Shows a "Getting Started" tip: "State variables let widgets share data. Try adding one!" with a quick-add button for a common variable (Boolean "running").
- **Instruments tab**: Shows a "Getting Started" tip: "Connect to lab instruments for live data. Add your first instrument!" with a quick-add button.
- **Bottom panel**: Code tab becomes available. Collapsed by default. "Unlock the code panel" hint shown after 2nd export.
- **Keyboard shortcut hints**: Tooltips on all header buttons include shortcuts. First time user uses a shortcut → toast: "Pro tip: Ctrl+D duplicates widgets!"

**Transition**: User adds first instrument OR adds first state variable. Flag stored: `labgui_has_used_advanced=true`.

### 6.4 Advanced User (Power Mode)

**Trigger**: User has added an instrument or state variable, OR explicitly enabled "Power Mode" in settings.

**UI State**:
- **All panels visible and accessible**: No hidden tabs, no restriction.
- **Code panel**: Available and suggested. Toast after instrument added: "See the generated instrument code in the Code panel (Ctrl+`)".
- **Instruments panel auto-opens**: When first instrument is added, the right sidebar switches to Instruments tab automatically (one time only).
- **State panel auto-opens**: When first state variable is added, sidebar switches to State Variables tab (one time only).
- **Advanced properties**: "Data Binding" section always visible in Properties panel (was hidden when no variables/instruments existed).
- **No onboarding hints**: All "Getting Started" tips dismissed permanently.
- **Keyboard shortcuts cheat sheet**: Available via Ctrl+/.
- **Settings access**: Full settings modal with all tabs.

### 6.5 Feature Discovery Triggers

| Action | Discovery Event | UI Response |
|--------|----------------|-------------|
| First drag from palette | Widget creation discovered | Toast: "Tip: Double-click text widgets to edit inline" |
| First multi-select (Ctrl+click or marquee) | Multi-selection discovered | Toast: "Tip: Change properties for all selected widgets at once" |
| First resize | Resize discovered | Size tooltip shown prominently |
| First property change | Properties panel confirmed | Brief highlight on canvas widget |
| 3rd widget added | Run Preview suggested | Subtle pulse on Run Preview button |
| First preview export | Export flow completed | Toast: "Great! The code runs independently. Try adding instrument bindings." |
| 10+ minutes of activity | Intermediate features unlocked | "State Variables" and "Instruments" tabs fade in |
| First time instruments panel opened | Instrument binding discovered | Highlight "+ Add Instrument" button |
| First time state panel opened | State variables discovered | Highlight "+ Add Variable" button |

### 6.6 Settings for Disclosure Control

In Settings > General:
- **Experience Level**: dropdown — Auto (default), Beginner, Intermediate, Advanced
  - Beginner: Simplified palette, hidden advanced tabs, maximum hints
  - Intermediate: Full palette, visible tabs, moderate hints
  - Advanced: Everything visible, no hints, code panel auto-shown
- **Reset Onboarding**: button — Resets all discovery flags, shows welcome again on next launch
- **Show Tooltips**: toggle — Master control for all contextual tooltips (default ON)
- **Show Code Panel by Default**: toggle — Auto-open bottom panel on project load (default OFF for beginner, ON for advanced)

---

## Appendix A: Widget Property Reference

### Complete property list per widget type

**Shared by all widgets**:
- name (str, unique identifier)
- x, y, width, height (int, geometry)
- visible (bool)
- locked (bool)
- bg_color (color or "transparent")
- fg_color (color)
- font_family (str)
- font_size (int)
- font_weight ("normal" | "bold")
- font_slant ("roman" | "italic")
- cursor (str)
- state ("normal" | "active" | "disabled")
- take_focus (bool)
- tooltip (str, optional)

**tk.Label**: text (str), justify ("left" | "center" | "right"), wraplength (int), anchor (str), compound ("none" | "text" | "image")

**tk.Button**: text (str), command (str), default ("normal" | "active" | "disabled"), repeatdelay (int), repeatinterval (int)

**tk.Entry**: textvariable (var ref), show (str), width (int), justify ("left" | "center" | "right"), validate (str), validatecommand (str)

**tk.Text**: width (int), height (int), wrap ("none" | "char" | "word"), yscrollcommand (str), xscrollcommand (str), state ("normal" | "disabled")

**tk.Checkbutton**: text (str), variable (var ref), onvalue, offvalue, indicatoron (bool), command (str)

**tk.Radiobutton**: text (str), variable (var ref), value, indicatoron (bool), command (str)

**tk.Scale**: from_ (float), to (float), resolution (float), tickinterval (float), orient ("horizontal" | "vertical"), length (int), showvalue (bool), variable (var ref), command (str)

**tk.Listbox**: height (int), width (int), selectmode ("single" | "browse" | "multiple" | "extended"), listvariable (var ref), yscrollcommand (str)

**ttk.Combobox**: values (list[str]), textvariable (var ref), width (int), state ("normal" | "readonly")

**tk.Spinbox**: from_ (float), to (float), increment (float), values (list[str]), textvariable (var ref), width (int), wrap (bool)

**ttk.Progressbar**: orient ("horizontal" | "vertical"), mode ("determinate" | "indeterminate"), maximum (float), variable (var ref), length (int)

**tk.Canvas**: width (int), height (int), scrollregion (tuple), xscrollcommand (str), yscrollcommand (str)

**ttk.Separator**: orient ("horizontal" | "vertical")

**tk.Frame**: borderwidth (int), relief (str), padx (int), pady (int)

**tk.LabelFrame**: text (str), labelanchor (str), borderwidth (int), relief (str)

**ttk.Notebook**: tabs (list[Tab]), width (int), height (int), padding (int)

**tk.PanedWindow**: orient ("horizontal" | "vertical"), sashwidth (int), sashrelief (str), sashpad (int)

**GridContainer**: rows (int), columns (int), row_padding (int), col_padding (int), uniform_rows (bool), uniform_cols (bool)

**InstrumentReadout**: decimal_places (int), unit_suffix (str), color_thresholds (JSON), show_minmax (bool), instrument_binding (ref), command_binding (ref)

**SerialMonitor**: default_baud (int), default_port (str), line_ending (str), local_echo (bool)

**PlotCanvas**: x_label (str), y_label (str), title (str), line_colors (list[str]), y_min (float), y_max (float), update_interval (int), num_points (int)

**DataLogger**: log_format ("CSV" | "JSON"), interval (int), max_file_size_mb (int), auto_start (bool), timestamp_format (str), sources (list[var ref])

**AlarmIndicator**: condition_expr (str), severity ("info" | "warning" | "critical"), flash_interval_ms (int), sound_enabled (bool), log_message_template (str), target_widget (ref)

---

## Appendix B: IR Schema Overview

The `.gui.json` Intermediate Representation is a JSON object with this top-level structure:

```json
{
  "version": "1.0",
  "metadata": {
    "name": "Multimeter Readout",
    "created": "2025-01-15T10:30:00Z",
    "modified": "2025-01-15T14:22:00Z",
    "canvas_state": {
      "zoom": 1.0,
      "pan_x": 0,
      "pan_y": 0,
      "snap_enabled": true,
      "snap_size": 8,
      "show_grid": true
    }
  },
  "window": {
    "title": "Multimeter Readout",
    "width": 800,
    "height": 600,
    "resizable_width": true,
    "resizable_height": true,
    "bg_color": "#f0f0f0"
  },
  "widgets": [
    {
      "id": "label_1",
      "type": "Label",
      "name": "voltage_label",
      "x": 50,
      "y": 30,
      "width": 200,
      "height": 30,
      "properties": { "text": "Voltage (DC)", ... },
      "bindings": { "text": { "var": "voltage_display" } }
    }
  ],
  "state_variables": [
    {
      "name": "voltage_display",
      "var_type": "StringVar",
      "default": "0.0000 V",
      "format": "%.4f V"
    }
  ],
  "instruments": [
    {
      "name": "DMM_34401A",
      "type": "VISA",
      "connection": { "resource": "GPIB0::22::INSTR", "timeout": 5000 },
      "commands": [
        { "name": "read_voltage", "send": "MEAS:VOLT:DC?\\n", "parse": "float(response.strip())" }
      ],
      "polling": { "enabled": true, "interval_ms": 500, "commands": ["read_voltage"] }
    }
  ],
  "data_loggers": [...],
  "alarms": [...]
}
```

**Key principles**:
- Widgets list is ordered by z-index (last = topmost).
- Container widgets include a `children` array of widget IDs.
- Grid Container children include `grid_row`, `grid_column`, `grid_rowspan`, `grid_columnspan`, `grid_sticky` in their properties.
- All coordinates are absolute (x,y) unless inside a Grid Container.
- Bindings reference state variables and instruments by name.
- The IR is the sole source of truth. Generated `.py` is derived and non-round-trippable.

---

## Appendix C: Generated Code Structure

### Flat Style (default for Phase 1)

```python
#!/usr/bin/env python3
"""Generated by LabGUI - Multimeter Readout"""

import tkinter as tk
from tkinter import ttk
import threading
import time

# --- Instrument Setup ---
# [instrument code if configured]

# --- State Variables ---
# [tk.StringVar / IntVar / DoubleVar / BooleanVar declarations]

# --- Main Window ---
root = tk.Tk()
root.title("Multimeter Readout")
root.geometry("800x600")
root.configure(bg="#f0f0f0")

# --- Widgets ---
# Each widget as: widget = tk.Widget(root, ...).place(x=..., y=..., width=..., height=...)
# or .grid(row=..., column=...) for Grid Container children

# --- Polling / Data Logging / Alarms ---
# [threading code if configured]

# --- Main Loop ---
root.mainloop()
```

### Class-Based Style (optional)

Same structure but wrapped in a class with `__init__`, `create_widgets()`, `setup_instruments()`, etc.

---

*End of Functional Architecture Specification*
