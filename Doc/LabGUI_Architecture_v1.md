# LabGUI Builder — Technical & Functional Architecture v1.0

## Browser-Based Visual Designer for Python tkinter GUIs in Lab Environments

**Status**: Implementation-Ready | **Target**: Web Application (Phase 1) | **Date**: 2026-05-07

---

## Table of Contents

1. [Decision Log](#1-decision-log)
2. [Functional Architecture](#2-functional-architecture)
   - 2.1 [Application Structure](#21-application-structure)
   - 2.2 [Feature Matrix](#22-feature-matrix)
   - 2.3 [User Flows](#23-user-flows)
   - 2.4 [UI Component Specifications](#24-ui-component-specifications)
   - 2.5 [Keyboard Shortcuts](#25-keyboard-shortcuts)
   - 2.6 [Progressive Disclosure Design](#26-progressive-disclosure-design)
3. [Technical Architecture](#3-technical-architecture)
   - 3.1 [Technology Stack](#31-technology-stack)
   - 3.2 [Component Hierarchy](#32-component-hierarchy)
   - 3.3 [State Management Architecture](#33-state-management-architecture)
   - 3.4 [Module Boundaries](#34-module-boundaries)
   - 3.5 [Canvas Rendering Engine](#35-canvas-rendering-engine)
   - 3.6 [Data Flow Architecture](#36-data-flow-architecture)
   - 3.7 [Performance Considerations](#37-performance-considerations)
   - 3.8 [Browser APIs](#38-browser-apis)
   - 3.9 [Deployment Architecture](#39-deployment-architecture)
4. [IR Schema & Code Generation](#4-ir-schema--code-generation)
   - 4.1 [Complete IR Schema](#41-complete-ir-schema)
   - 4.2 [Complete JSON Example](#42-complete-json-example)
   - 4.3 [Tkinter Code Generator Design](#43-tkinter-code-generator-design)
   - 4.4 [Grid Container Code Generation](#44-grid-container-code-generation)
   - 4.5 [State Variable Code Generation](#45-state-variable-code-generation)
   - 4.6 [Instrument Code Generation](#46-instrument-code-generation)
   - 4.7 [Data Logger Code Generation](#47-data-logger-code-generation)
   - 4.8 [Alarm Code Generation](#48-alarm-code-generation)
   - 4.9 [Cleanup Code Generation](#49-cleanup-code-generation)
   - 4.10 [Schema Validation & Migration](#410-schema-validation--migration)
   - 4.11 [Widget Property Defaults Table](#411-widget-property-defaults-table)
5. [Lab Domain Architecture](#5-lab-domain-architecture)
   - 5.1 [Instrument Binding System](#51-instrument-binding-system)
   - 5.2 [State Variable System](#52-state-variable-system)
   - 5.3 [Data Logging System](#53-data-logging-system)
   - 5.4 [Alarm System](#54-alarm-system)
   - 5.5 [Lab Templates](#55-lab-templates)
   - 5.6 [Real-Time Data Considerations](#56-real-time-data-considerations)
   - 5.7 [Error Handling Strategy](#57-error-handling-strategy)
6. [Phase 1 Implementation Roadmap](#6-phase-1-implementation-roadmap)
7. [Risks & Mitigations](#7-risks--mitigations)
8. [Glossary](#8-glossary)

---

## Executive Summary

### What This Product Is

LabGUI Builder is a browser-based visual design tool that enables scientists, lab technicians, and developers to create Python tkinter GUIs for laboratory instrumentation through direct manipulation. Users drag widgets onto a canvas, configure properties, bind instruments, and export runnable Python code — all without writing a single line of code by hand. The `.gui.json` Intermediate Representation (IR) file serves as the single source of truth for every project; exported `.py` files are derived, disposable artifacts that are non-round-trippable by design.

### Key Architectural Decisions

- **Web application only (Phase 1)**: No desktop app wrapper — the tool runs entirely in the browser, eliminating installation friction for lab users across Windows, macOS, and Linux.
- **Pure client-side, zero backend**: All computation (canvas rendering, code generation, project storage) runs in the browser. No server, no database, no cloud dependency — critical for lab environments with restricted network access.
- **Wireframe preview + Run Preview button**: The canvas displays wireframe representations of widgets for precise layout control. A "Run Preview" button generates and downloads a runnable `.py` file for visual verification, rather than attempting to embed a live tkinter preview in the browser.
- **Absolute positioning + Grid Container hybrid**: Most widgets use absolute `place()` positioning for pixel-precise control. Grid Container widgets provide structured `grid()` layout for forms and dashboards. No automatic conversion between modes — the user explicitly chooses.
- **tkinter-only export (Phase 1)**: The code generator targets Python's built-in tkinter/ttk only. PyQt/PySide support is deferred to a future phase.
- **IR as source of truth**: The `.gui.json` file is the canonical project representation. The `.py` export is a one-way, disposable build artifact.
- **DOM-based canvas rendering**: Widgets render as absolutely-positioned DOM div elements overlaid with HTML5 Canvas 2D for selection, guides, and grid — providing native event handling and CSS styling without a custom render engine.
- **VISA + Serial protocols only (Phase 1)**: Instrument communication covers the 80% use case via pyvisa and pyserial. TCP, UDP, and Modbus are deferred.
- **Configurable command-response templates**: Each instrument command is defined with a send string, parse type, and optional transform — providing full control over SCPI/serial communication rather than generic "query" abstractions.
- **Typed state variables**: Four distinct tkinter variable types (StringVar, IntVar, DoubleVar, BooleanVar) with format strings and min/max validation — not just generic StringVar.
- **Data logging + alarms as core features**: Built-in threaded data logger (CSV with rotation) and alarm monitor (with hysteresis) are first-class features, not optional plugins.

### Target User and Value Proposition

**Primary users**: Scientists, lab technicians, graduate students, and instrumentation engineers who need to build control/monitoring GUIs for lab equipment but lack the time or expertise to hand-code tkinter layouts.

**Value proposition**: What previously required hours of hand-coding widget positions, instrument polling loops, and data logging threads can now be accomplished in minutes through visual design. The generated code is clean, production-ready Python that follows PEP8 conventions and properly handles threading, connection cleanup, and error recovery.

### Technology Approach

The front end is a React 18 single-page application built with TypeScript (strict mode), Vite, Tailwind CSS, and Zustand for state management, using a hybrid DOM+Canvas 2D rendering engine with @dnd-kit for drag-and-drop interactions, Monaco Editor for code display, and Web Workers for non-blocking code generation.

### Phase 1 Scope Summary

Phase 1 delivers a complete, self-contained web application with: a visual canvas designer supporting 13 core widget types plus containers; snap-to-grid, smart guides, and zoom/pan; undo/redo with 200-entry history; project save/load via `.gui.json` files; one-click Python tkinter export; instrument binding for VISA and Serial devices; typed state variables with widget bindings; data logging to CSV with file rotation; alarm monitoring with hysteresis and configurable actions; 5 built-in lab templates; and deployment to GitHub Pages as a zero-cost static site.

---

## 1. Decision Log

| # | Decision | Context | Chosen Option | Rationale | Status |
|---|----------|---------|---------------|-----------|--------|
| D1 | **Platform: Webapp only (no desktop Phase 1)** | Need cross-platform access with zero installation friction for lab users on Windows, macOS, and Linux. | Browser-based SPA, pure client-side. | Eliminates all installation and update friction. Works on any OS with a modern browser. No Electron bloat or native packaging. Lab environments often restrict software installation — a browser app bypasses this. | Reversible — desktop wrapper (Tauri/Electron) could be added later if offline usage is critical. |
| D2 | **Architecture: Pure client-side (no backend)** | Lab environments frequently have restricted internet access. Backend services would create dependency and privacy concerns. | Zero-server architecture. All computation in browser. GitHub Pages for hosting. | No server maintenance, no API to secure, no uptime to monitor. Works fully offline after first load (Service Worker). Lab data never leaves the user's machine. Zero hosting cost. | Reversible — backend could be added later for cloud sync or collaboration features. |
| D3 | **Preview mode: Wireframe + Run Preview button** | Need to show widget layout on canvas. Cannot run tkinter in browser. | Canvas shows wireframe representations. "Run Preview" button generates and downloads `.py` file for local execution. | Wireframes provide precise visual feedback for layout design without mimicking tkinter theming (which varies by OS). Download-and-run is more reliable than any embedded preview. No browser security restrictions on file downloads. | Irreversible — this is the correct architectural choice for the domain. |
| D4 | **Layout: Absolute positioning + Grid Container** | tkinter supports multiple geometry managers (place, grid, pack). Need to pick a primary approach. | Absolute `place()` for free positioning. Optional Grid Container widget uses `grid()` for structured layouts. No automatic conversion. | Absolute positioning gives users pixel-precise control matching the visual canvas. Grid Container provides the power of `grid()` when needed for responsive forms. Explicit choice prevents confusion. | Reversible — additional geometry managers could be added. |
| D5 | **Export target: tkinter-only (Phase 1)** | Could support multiple GUI frameworks. | Python tkinter/ttk only. PyQt/PySide deferred. | tkinter is included with every Python installation — no pip install required. It is the de facto standard for simple lab GUIs. Single-target code generation is simpler and more robust. PyQt support could be a Phase 2 generator plugin. | Reversible — additional generator backends can be added. |
| D6 | **Source of truth: IR (.gui.json) is canonical** | Need to decide whether `.py` files can be re-imported. | `.gui.json` is the only editable project format. `.py` is one-way export, non-round-trippable. | Parsing Python back to a visual representation is an intractable problem (Tcl/Tk runtime state, custom code, imports). JSON IR is clean, versioned, and fully specifies the project state. Users save `.gui.json` and export `.py` when ready. | Irreversible — round-tripping from `.py` is architecturally unsound for this domain. |
| D7 | **Front-end stack: React 18 + TypeScript + Vite + Tailwind + Zustand** | Need a modern, maintainable web stack for a complex design tool. | React 18 (Concurrent Features), TypeScript 5.3+ strict, Vite 5+, Tailwind CSS 3.4+, Zustand 4.4+. | React: ecosystem maturity, canvas tooling, Concurrent Features for debounced code gen. TypeScript strict: type safety across widget definitions and code generation. Vite: sub-second HMR, optimized static builds. Tailwind: no CSS file proliferation in panel-dense UI. Zustand: minimal API, selector-based subscriptions prevent re-renders on drag. | Reversible — individual libraries could be swapped with equivalents. |
| D8 | **Canvas rendering: DOM-based (not HTML5 Canvas primary)** | Need to render 50-100+ widgets with selection, drag, resize. | Primary: absolutely-positioned DOM divs for widgets. Overlay: HTML5 Canvas 2D for selection bounding boxes, resize handles, grid, smart guides. | DOM gives native event handling, CSS styling, and accessibility. Canvas overlay provides pixel-perfect control for decorations that don't need events. Used successfully by Retool and similar design tools. | Reversible — could shift more to Canvas if performance demands it. |
| D9 | **Instrument protocols: VISA + Serial only (Phase 1)** | Many communication protocols exist for lab instruments. | Phase 1: VISA (GPIB/USB/TCPIP/Serial via pyvisa-py) and direct Serial (pyserial). TCP, UDP, Modbus deferred. | VISA + Serial covers approximately 80% of lab instruments. pyvisa-py is pure Python (no NI drivers needed). Adding protocols later is straightforward via the instrument schema. | Reversible — additional protocols can be added to the IR schema and generator. |
| D10 | **Command templates: Configurable (not generic "query")** | Each instrument has unique SCPI commands and response formats. | Per-command definition: send string, parse type (float/int/string/regex/bytes/json), optional transform expression, timeout, unit, format string. | Generic "query" abstractions break down in practice. A Keysight DMM's `MEAS:VOLT:DC?\n` is fundamentally different from a Tektronix scope's `CURVE?`. Explicit command definitions produce reliable generated code and enable pre-built template libraries. | Irreversible — this is a core design philosophy. |
| D11 | **State variables: Typed (DoubleVar/IntVar/BooleanVar, not just StringVar)** | tkinter provides multiple variable types. | Four types: StringVar (str), IntVar (int), DoubleVar (float), BooleanVar (bool). Each with format strings, min/max validation. | StringVar-only leads to constant type conversion in generated code. Typed variables produce cleaner, more correct Python. Format strings (e.g., `%.4f V`) enable proper display without manual formatting code. | Reversible — could add more types later. |
| D12 | **Data logging + alarms: Core features (not optional)** | Data logging and alarm monitoring are essential for lab UIs. | Built-in DataLogger widget and Alarm system, both with generated threaded Python code. | These features are universally needed in lab GUIs. Making them core ensures the generated code is production-ready. CSV logging with file rotation and alarm monitoring with hysteresis are non-trivial to implement correctly — providing them out-of-the-box is a key differentiator. | Reversible — could be extracted to plugins in future. |

---

## 2. Functional Architecture

### 2.1 Application Structure

#### 2.1.1 Overall Layout Model

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

#### 2.1.2 Header Bar

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
| Run Preview | Primary button | Play icon + "Run Preview" text. Background `#89b4fa`, text `#1e1e2e`, font 13px/600, padding 6px 14px, border-radius 4px. Hover: `#b4befe`. Click: triggers preview generation flow. |
| Export | Secondary button | Download icon + "Export .py" text. Background transparent, border 1px `#585b70`, text `#cdd6f4`. Hover: background `#313244`. Click: opens Export modal. |
| Settings | Icon button | Gear icon. Tooltip: "Settings". Opens Settings modal. |
| Left Panel Toggle | Icon button | Panel-left icon. Toggles left sidebar visibility. Active state: icon highlighted. |
| Right Panel Toggle | Icon button | Panel-right icon. Toggles right sidebar visibility. Active state: icon highlighted. |
| Bottom Panel Toggle | Icon button | Panel-bottom icon. Toggles bottom panel visibility. Active state: icon highlighted. |

---

#### 2.1.3 Left Sidebar (240px, collapsible to 36px icon mode)

**Structure**: Two tabs at top (tab bar height 36px), content area below.

##### Tab 1: Widget Palette

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
- **Scale (H/V)**: `tk.Scale` — Horizontal or vertical numeric slider. Configurable from, to, resolution, tick interval, orient.
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

**Palette Item Rendering**: Each item is a 56px tall row: 20px icon (centered) + label text (12px). Drag initiated on mousedown creates a ghost element following cursor; drop on canvas creates widget at drop position.

**Search/filter**: At top of palette, a 28px search input filters widget list in real-time. Placeholder: "Search widgets...". Matches against widget name and category.

##### Tab 2: Template Gallery

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

#### 2.1.4 Center Canvas

**The canvas is the primary design surface where all widget placement and manipulation occurs.**

##### Visual Structure

- **Background**: `#1e1e2e` (dark slate).
- **Grid overlay**: Dotted grid at snap interval (default 8px). Dot color: `#313244`, 1px. Faded further at zoom levels < 50%.
- **Window boundary rectangle**: Dashed line (`#585b70`, 2px, 8px dash) showing the tkinter root window dimensions. Default 800x600, editable via Properties panel when nothing selected. Resize handles on this rectangle adjust window size.
- **Origin markers**: Small "X" and "Y" labels at (0,0) with 1px axis lines extending 20px in each direction, color `#585b70`.
- **Rulers** (optional, default OFF): Top and left edge rulers showing pixel coordinates. Toggle in View menu. Background `#11111b`, text `#6c7086`, tick marks every 50px with labels every 100px.

##### Coordinate System

- **Canvas space**: Infinite 2D plane. The visible viewport is a rectangular region into this plane.
- **Widget coordinates**: All widgets stored as `(x, y, width, height)` in canvas pixels, where (0,0) = top-left of the tkinter root window.
- **Negative coordinates**: Allowed. Widgets with negative coordinates are rendered outside the window boundary rectangle (they will be clipped at runtime). Visual indicator: a muted overlay area outside the window bounds.
- **Coordinate display**: Bottom-right of canvas shows current mouse coordinates in format "X: 142  Y: 280" in 11px `#6c7086` text.

##### Zoom and Pan

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

##### Selection System

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

##### Drag and Drop

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

##### Snap-to-Grid and Smart Guides

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
- Label at intersection: offset value in 10px text (e.g., "Delta: 0").

##### Inline Editing

Double-click on a Label or Button widget enters inline text edit mode:
- Widget's text becomes an editable `<input>` or `<textarea>` overlaid at the widget's position.
- Font matches widget's configured font. Background: `#313244`, border: 1px `#89b4fa`.
- Enter or blur commits. Escape cancels.
- While in inline edit, all canvas shortcuts are disabled.

##### Context Menu

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

#### 2.1.5 Right Sidebar (280px, tabbed)

Four tabs. The active tab persists per project. Default active tab: Properties.

##### Tab 1: Properties Panel

**Contextual — content changes based on selection.**

**No selection state**: Shows window-level properties:
- Window Title: text input (default "tkinter GUI")
- Window Size: W x H inputs (default 800 x 600)
- Window Position: X x Y inputs (default center on screen)
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
- Font Size — numeric input (6-72)
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

*Widget-specific sections*: Each widget type shows only its relevant properties. See Appendix A in the full specification for the complete property list per widget type.

**Multiple widgets selected**: Shows only shared/common properties. Values show "—" (mixed) when widgets have different values for the same property. Changing a property applies to all selected widgets.

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

##### Tab 2: Widget Tree / Layers Panel

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

##### Tab 3: State Variables Panel

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

##### Tab 4: Instruments Panel

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

#### 2.1.6 Bottom Panel (collapsible, max-height 300px)

**Toggle**: Via header button or Ctrl+` (backtick).

##### Tab 1: Live Code Panel

**Shows the generated tkinter Python code in real-time.**

- **Read-only** code display with syntax highlighting (Python grammar).
- **Auto-scroll to relevant section**: When a widget is selected on canvas, the code panel auto-scrolls to highlight the code block for that widget.
- **Line numbers**: Displayed in gutter.
- **Copy button**: "Copy All" at top right. Copies entire generated code to clipboard.
- **Word wrap toggle**: Button at top right.
- **Update behavior**: Debounced 500ms after any property change. "Updating..." indicator (small spinner) during regeneration.
- **Syntax validation indicator**: Green checkmark if generated code passes AST parse, red X with error tooltip if not.
- **Empty project state**: Shows a comment block with instructions: `# Create widgets on the canvas to see generated code here.`

##### Tab 2: Event Log Panel

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

#### 2.1.7 Modals and Overlays

##### New Project Modal

**Trigger**: File > New or Ctrl+N.
- **Title**: "New Project"
- **Content**: Template gallery grid (same as left sidebar Template tab, but larger cards: 160x120px). "Empty Project" is first.
- **Recent projects**: Below templates, a "Recent Projects" list with names and "Open" links.
- **Actions**: "Create" (primary, disabled until template selected) + "Cancel".
- **Unsaved changes guard**: If current project has unsaved changes, show confirmation dialog: "You have unsaved changes. Save before creating a new project?" [Save] [Don't Save] [Cancel].

##### Export Options Modal

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

##### Instrument Configuration Modal

**Trigger**: "+ Add Instrument" in Instruments panel, or edit existing instrument.
- **Title**: "Configure Instrument" (or "Edit Instrument: {name}")
- **Tabs**: Connection | Commands | Polling

*Connection tab*:
- Instrument Name: text input (required, Python-identifier valid)
- Instrument Type: radio group — VISA / Serial / Mock (for testing)
- **VISA fields** (conditional): Resource String, Backend (pyvisa-py / NI-VISA), Timeout (ms)
- **Serial fields** (conditional): Port, Baud Rate, Data Bits, Parity, Stop Bits, Flow Control
- **Mock fields** (conditional): Simulation Mode, Update interval, Amplitude/Range

*Commands tab*:
- Table of command definitions. Columns: Name | Send String | Parse Expression | Description | Test
- "+ Add Command" button adds a row.
- Test button: sends command using configured connection and displays raw response + parsed value in a popup.

*Polling tab*:
- Enable polling: toggle
- Interval (ms): number input, min 50, default 500
- Poll commands: multi-select from defined commands
- On error: dropdown — "Log and continue" (default), "Stop polling", "Retry 3x then stop"

##### State Variable Editor Modal

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

##### Settings Modal

**Trigger**: Gear icon in header.
- **Tabs**: General | Canvas | Code Generation | Account

*General*: Theme (Dark/Light/High Contrast), Auto-save toggle + interval, Confirm destructive actions, Default window size.

*Canvas*: Default snap-to-grid, Default grid size, Default show grid, Smart guides toggle, Nudge amount, Shift-nudge amount.

*Code Generation*: Default export style (Flat/Class-based), Include docstrings, Include type hints, Shebang line toggle, Encoding declaration toggle.

*Account* (future placeholder): Sign in / Sign up buttons (for cloud sync, deferred).


---

### 2.2 Feature Matrix

#### Priority Definitions

| Priority | Description | Timeline |
|----------|-------------|----------|
| **P0** | Critical path — app is non-functional without this | Phase 1, Week 1-3 |
| **P1** | Important — significantly impacts UX or workflow | Phase 1, Week 3-6 |
| **P2** | Nice-to-have — enhances but not blocking | Phase 1, Week 6+ or Phase 2 |

#### 2.2.1 Canvas & Layout

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Canvas with pan/zoom** | P0 | Infinite canvas with middle-mouse pan, mousewheel zoom (25-300%), zoom-to-fit. All interactions smooth at 60fps. |
| 2 | **Snap-to-grid** | P0 | Configurable grid size (4/8/16/32px). Toggle on/off. Snaps widget position and size. Visual grid dots. |
| 3 | **Smart guides (edge alignment)** | P0 | Yellow dashed alignment guides when dragging near other widget edges/centers. Tolerance 4px. |
| 4 | **Selection with resize handles** | P0 | Click to select. 8 resize handles on single selection. Collective resize on multi-selection. Visual feedback. |
| 5 | **Multi-select** | P0 | Ctrl+click toggle, Shift+click add, marquee rectangle select. Shows collective bounding box. |
| 6 | **Undo/Redo** | P0 | 200-entry history with Immer patches. Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z. Compresses rapid operations. |
| 7 | **Keyboard nudge** | P0 | Arrow keys move 1px. Shift+arrow moves 10px (configurable). Applies to all selected widgets. |
| 8 | **Inline text editing** | P0 | Double-click label/button to edit text inline. Enter/blur commits, Escape cancels. |
| 9 | **Context menus** | P0 | Right-click on widget and canvas. Cut/Copy/Paste/Duplicate/Delete/Lock/Group/Z-order. |
| 10 | **Window boundary rectangle** | P0 | Dashed rectangle showing tkinter root window bounds. Resize handles adjust window size. |
| 11 | **Drag-and-drop from palette** | P0 | Mousedown on palette widget, drag to canvas, drop to create. Ghost element follows cursor. |
| 12 | **Drag-to-move on canvas** | P0 | Mousedown on widget, drag to reposition. Real-time position update with snap. |
| 13 | **Marquee selection** | P0 | Click and drag on empty canvas to create selection rectangle. Selects all intersecting widgets. |
| 14 | **Z-order control** | P1 | Bring to Front, Send to Back, Bring Forward, Send Backward. Via context menu and shortcuts. |
| 15 | **Grid container with grid() layout** | P1 | Widget that manages children using tkinter grid(). Configurable rows/columns. Children have row/col/sticky/pad properties. |
| 16 | **Container widgets** | P1 | Frame, LabelFrame, Notebook (tabs), PanedWindow (resizable split). Full nesting support. |
| 17 | **Lock/visibility toggles** | P1 | Lock prevents selection/move. Hide excludes from generated code. Via Widget Tree panel. |
| 18 | **Group/Ungroup** | P1 | Group selected widgets into a logical unit. Moves together, resizes together. Ungroup restores independence. |
| 19 | **Coordinate display** | P1 | Mouse coordinates shown at bottom-right of canvas. |
| 20 | **Rulers** | P2 | Optional top/left rulers with pixel tick marks. Toggle in View menu. |
| 21 | **Widget search/filter in palette** | P2 | Search input filters widget list. Matches name and category. |
| 22 | **Canvas background patterns** | P2 | Dark (default), Light, Dot pattern options. |

#### 2.2.2 Widget System

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Label** | P0 | Static text display. Font, color, anchor, wrap length, justify. |
| 2 | **Button** | P0 | Clickable. Text, command callback, state (normal/active/disabled), relief. |
| 3 | **Entry** | P0 | Single-line text input. Width, justify, show char, state, validate mode. |
| 4 | **Frame** | P0 | Container with border and relief. bd, bg, relief, padx, pady. |
| 5 | **Grid Container** | P1 | Container using grid() for children. Rows, columns, padding, sticky, weights. |
| 6 | **Text** | P1 | Multi-line text. Width, height, wrap mode, yscrollcommand, state. |
| 7 | **Checkbutton** | P1 | Boolean toggle. Text, variable binding, on/off values, indicator on/off. |
| 8 | **Radiobutton** | P1 | Mutually exclusive option. Text, variable binding, value, indicator on/off. |
| 9 | **Scale (H/V)** | P1 | Numeric slider. From, to, resolution, orient, length, variable binding. |
| 10 | **Listbox** | P1 | Scrollable item list. Height, select mode, list items, yscrollcommand. |
| 11 | **Combobox** | P1 | Dropdown selection. Values list, textvariable, state (readonly/normal), width. |
| 12 | **Spinbox** | P1 | Numeric/text spinner. From, to, increment, values list, textvariable. |
| 13 | **LabelFrame** | P1 | Titled container. Text, labelanchor, bd, relief. |
| 14 | **Notebook** | P1 | Tabbed container. Tab labels, tab order, width, height. Each tab is a child container. |
| 15 | **PanedWindow** | P1 | Resizable split container. Orient (horizontal/vertical), sash width/relief. |
| 16 | **Progressbar** | P1 | Progress indicator. Orient, mode (determinate/indeterminate), max, variable binding. |
| 17 | **Canvas (tk)** | P2 | Drawing surface. Width, height, bg, scrollregion. For custom drawings. |
| 18 | **Separator** | P2 | Visual divider. Orient (horizontal/vertical). |

#### 2.2.3 Lab Widgets

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Instrument Readout** | P1 | Large numeric display with units. Decimal places, color thresholds, min/max display. Bound to instrument variable. |
| 2 | **Serial Monitor** | P2 | Composite: Text (output) + Entry (input) + Send button. Configurable baud, port, line ending. |
| 3 | **Plot Canvas** | P2 | Matplotlib `FigureCanvasTkAgg` placeholder. Configurable axes, colors, update interval. |
| 4 | **Data Logger** | P1 | Status display + control buttons (Start/Stop/Pause). Configurable format, interval, file size. |
| 5 | **Alarm Indicator** | P1 | LED-style indicator with configurable condition, severity, flash animation. |

#### 2.2.4 Properties & Data Binding

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Properties panel** | P0 | Right sidebar Properties tab. Contextual fields based on widget type. Sections: Geometry, Appearance, Behavior. |
| 2 | **Color picker** | P0 | Click color swatch opens picker with hue slider, saturation/value square, hex input, preset palette, recent colors. |
| 3 | **Font selector** | P0 | Family dropdown, size input (6-72), weight toggle (normal/bold), slant toggle (roman/italic). |
| 4 | **State variable binding** | P1 | Bind widget properties (text, variable, value) to tkinter variables. Configurable transform expression. |
| 5 | **Instrument binding** | P1 | Bind widgets to instrument channels. Displays live values in preview. |
| 6 | **Window properties (no selection)** | P0 | When nothing selected, show window title, size, position, resizable, bg color. |
| 7 | **Multi-select properties** | P0 | Shared properties only. Mixed values show "—". Changes apply to all selected. |
| 8 | **Property validation** | P0 | Real-time validation. Red border on invalid. Tooltip with error. |
| 9 | **Transform expressions** | P2 | Python expression applied to bound variable value before display. E.g., `value * 1000` for mV. |

#### 2.2.5 Project Management

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **New project** | P0 | File > New or Ctrl+N. Opens template gallery modal. |
| 2 | **Open project** | P0 | File > Open or Ctrl+O. Opens file picker for `.gui.json`. Validates and loads. |
| 3 | **Save project** | P0 | File > Save or Ctrl+S. Serializes IR to `.gui.json`. Overwrites existing file. |
| 4 | **Save As** | P0 | File > Save As or Ctrl+Shift+S. Prompts for new filename. |
| 5 | **Auto-save** | P1 | Every 30 seconds (configurable) to `localStorage`. Recovery prompt on reload if crash detected. |
| 6 | **Recent projects** | P1 | Last 10 projects shown in File menu and New Project modal. Stored in localStorage. |
| 7 | **Template system** | P1 | Pre-built project templates with pre-placed widgets. Load as starting point. See Lab Templates (Section 5.5). |

#### 2.2.6 Code Generation

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Real-time code panel** | P0 | Bottom panel shows generated code. Read-only, syntax highlighted. Debounced 500ms updates. |
| 2 | **One-click export** | P0 | Export button generates and downloads `.py` file. Flat or class-based style. |
| 3 | **Copy to clipboard** | P0 | Copy generated code to clipboard from code panel and export modal. |
| 4 | **Export options** | P1 | Modal: filename, style (flat/class), docstrings, type hints, minimize imports. Live 15-line preview. |
| 5 | **Syntax validation** | P1 | Generated code validated via AST parse. Green/red indicator. Error details on failure. |
| 6 | **Widget code highlight** | P1 | Selecting widget auto-scrolls code panel to that widget's code block. |
| 7 | **Web Worker generation** | P2 | Code generation runs in Web Worker to avoid blocking UI. |

#### 2.2.7 Instrumentation

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **VISA instrument support** | P1 | VISA resource string, backend (pyvisa-py), timeout, read_termination. Command definitions. |
| 2 | **Serial instrument support** | P1 | Port, baud rate, data bits, parity, stop bits, flow control. Command definitions. |
| 3 | **Command templates** | P1 | Per-command: name, send string, parse expression (float/int/string/regex), optional transform. |
| 4 | **Polling configuration** | P1 | Enable/disable, interval (ms), select commands to poll, error handling mode. |
| 5 | **State variable bindings** | P1 | Bind instrument command results to tkinter variables for widget display. |
| 6 | **Test connection** | P1 | Per-instrument test button. Sends *IDN? (VISA) or identity query. Displays response. |
| 7 | **Mock instrument** | P2 | Simulated instrument for testing without hardware. Configurable update interval and value range. |

#### 2.2.8 State Variable System

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Typed variables** | P1 | StringVar, IntVar, DoubleVar, BooleanVar. Each with appropriate Python type. |
| 2 | **Variable editor** | P1 | Modal: name (validated Python identifier), type, default value, format string, description. |
| 3 | **Binding UI** | P1 | Properties panel shows "Bind to Variable" dropdown. Lists compatible variables. |
| 4 | **Format strings** | P2 | Display format per variable: `%.4f V`, `%d samples`, etc. Applied to widget display. |

#### 2.2.9 Data Logging

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Data Logger widget** | P1 | Configurable sources (state variables), format (CSV/JSON), interval, file path. |
| 2 | **File rotation** | P1 | Max file size, max age, max file count. Auto-rotation with timestamped filenames. |
| 3 | **Threaded logging** | P1 | Daemon thread for non-blocking file I/O. Buffering for performance. |

#### 2.2.10 Alarm System

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Alarm conditions** | P1 | gt, lt, gte, lte, eq, neq, in_range, out_of_range, rate_of_change, stale_data, deviation. |
| 2 | **Hysteresis** | P1 | Configurable reset threshold to prevent alarm flapping. |
| 3 | **Alarm actions** | P1 | Visual (flash widget), log, popup, set_variable, sound. Multiple actions per alarm. |
| 4 | **Cooldown** | P1 | Minimum interval between alarm triggers. |

#### 2.2.11 UI/UX Polish

| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| 1 | **Dark theme** | P0 | Default dark theme optimized for lab environments. Consistent color tokens. |
| 2 | **Keyboard shortcuts** | P0 | Full shortcut system. See Section 2.5. |
| 3 | **Tooltips** | P0 | All header buttons, palette items, property labels show descriptive tooltips. |
| 4 | **Toast notifications** | P1 | Non-intrusive notifications for: export complete, save complete, error, copy success. Auto-dismiss 3s. |
| 5 | **Collapsible panels** | P1 | All sidebars and bottom panel collapsible. Toggle buttons in header. |
| 6 | **Responsive layout** | P1 | Adapts to screen width: sidebars collapse to icon mode on narrow screens. |
| 7 | **Progressive disclosure** | P2 | Advanced features (instruments, state variables) hidden behind tabs initially. Unlock as user progresses. |
| 8 | **First-launch onboarding** | P2 | Brief tutorial overlay highlighting key UI areas on first visit. |

---

### 2.3 User Flows

#### Flow A: Creating a Simple GUI (Core Workflow)

**Objective**: User creates a new project, adds widgets, configures properties, and exports Python code.

**Flow**:
1. User opens application (auto-loads last project or shows empty state).
2. Clicks "File > New" (Ctrl+N). New Project modal opens with template gallery.
3. User selects "Empty Project" and clicks "Create".
   - New empty project created with default 800x600 window.
   - Canvas shows empty state message: "Drag widgets here to start building" with animated arrow pointing to left sidebar.
4. User drags a "Button" widget from the palette onto the canvas.
   - Button appears at drop position, snapped to grid.
   - Button is auto-selected (blue bounding box + handles).
   - Properties panel shows button properties.
   - Widget Tree panel updates with "button_1" entry.
   - Code panel updates with Button creation code.
5. User changes button text in Properties panel: text field changed from "Button" to "Read Voltage".
   - Button text updates in real-time on canvas.
   - Code panel updates (debounced 500ms).
6. User drags a "Label" widget to position below the button.
   - Label created, selected, shows default text "Label".
7. User double-clicks the label to enter inline text edit mode.
   - Inline text input appears overlaid on the label.
   - User types "Voltage: --- V" and presses Enter.
   - Label updates with new text. Inline edit mode exits.
8. User adjusts label position using arrow keys (nudge 1px per press).
9. User selects both widgets (Ctrl+click or marquee selection).
10. User clicks "Export .py" button in header.
    - Export Options modal opens.
    - User reviews preview, clicks "Export .py".
    - File downloaded as `untitled_project.py`.
    - Toast: "Exported successfully!" with "Open folder" link.

**Edge cases**:
- User drags widget outside canvas bounds: widget is placed at (0,0) or nearest valid position with visual feedback.
- User tries to export with no widgets: Toast warning "Add at least one widget before exporting."
- Browser blocks download: Toast error "Download blocked. Check browser permissions."

---

#### Flow B: Configuring an Instrument Connection

**Objective**: User adds a VISA instrument, defines commands, tests connection, and binds to a widget.

**Flow**:
1. User clicks "Instruments" tab in right sidebar.
   - Empty state shown: "No instruments configured." with "+ Add Instrument" button.
2. User clicks "+ Add Instrument".
   - Instrument Configuration modal opens (Connection tab active).
3. User fills Connection tab:
   - Instrument Name: "DMM_34401A"
   - Type: "VISA" (radio selected)
   - Resource String: "GPIB0::22::INSTR"
   - Backend: "pyvisa-py" (dropdown)
   - Timeout: 5000 (ms)
4. User clicks "Commands" tab.
   - Clicks "+ Add Command".
   - Row added to commands table:
     - Name: "read_voltage"
     - Send String: "MEAS:VOLT:DC?\n"
     - Parse Expression: "float(response.strip())"
   - Adds second command:
     - Name: "read_idn"
     - Send String: "*IDN?\n"
     - Parse Expression: "response.strip()" (string, no transform)
5. User clicks "Test" button next to "read_idn" command.
   - Connection attempted. Success: popup shows instrument identification string.
   - Error: popup shows error details.
6. User clicks "Polling" tab.
   - Enables polling toggle.
   - Interval: 500 ms.
   - Selects "read_voltage" command for polling.
   - Error handling: "Log and continue".
7. User clicks "Save".
   - Instrument added to Instruments panel list.
   - Green status dot appears (connected in preview).
8. User selects a Label widget on canvas that displays voltage.
9. In Properties panel, user selects "Bind to Instrument" dropdown.
   - Lists: "DMM_34401A / read_voltage"
   - User selects it.
   - Label now bound to instrument channel.
10. In Instruments panel, voltage value from instrument appears next to the read_voltage command.
    - The bound label's text updates to show the live value.

**Edge cases**:
- Resource string is invalid: Test connection shows error. User corrects and retries.
- Instrument is offline: Status dot turns red. Polling stops. Toast: "DMM_34401A disconnected."
- No instruments of required type: Dropdown shows "No instruments available. Add one in the Instruments panel."

---

#### Flow C: Using State Variables for Widget Interconnection

**Objective**: User creates state variables, binds multiple widgets to them, and verifies reactive updates.

**Flow**:
1. User clicks "State Variables" tab in right sidebar.
   - Empty state: "No state variables defined." with "+ Add Variable" button.
2. User clicks "+ Add Variable".
   - State Variable Editor modal opens.
3. User creates variable:
   - Name: `voltage_reading`
   - Type: `Double` (`tk.DoubleVar`)
   - Default: 0.0
   - Format: "%.4f V"
   - Description: "Current voltage reading from DMM"
   - Clicks "Save".
4. Variable appears in State Variables panel list with type badge `float` and default value "0.0000 V".
5. User creates second variable:
   - Name: `is_running`
   - Type: `Boolean` (`tk.BooleanVar`)
   - Default: False
   - Clicks "Save".
6. User selects the voltage display Label on canvas.
   - In Properties panel, "Bind to Variable" dropdown shows `voltage_reading (Double)`.
   - User selects it. Label text changes to "0.0000 V" (formatted default).
7. User selects the Start/Stop Button on canvas.
   - In Properties panel, "Bind to Variable" dropdown shows `is_running (Boolean)`.
   - User selects it. Button now bound to boolean variable.
8. User adds a Checkbutton widget.
   - Binds it to `is_running` as well.
9. User clicks "Run Preview".
   - `.py` file generated and downloaded.
   - User runs it locally. Both Button and Checkbutton reflect the same `is_running` state.
   - Toggling Checkbutton updates Button state (and vice versa) via shared variable.

**Edge cases**:
- Invalid variable name (not Python identifier): Real-time validation error. Save disabled.
- Duplicate variable name: Error on save. "Variable 'voltage_reading' already exists."
- Type mismatch in binding: Dropdown grays out incompatible types. Tooltip: "DoubleVar cannot bind to Boolean property."

---

#### Flow D: Data Logging Setup

**Objective**: User configures data logging for voltage readings to a CSV file with rotation.

**Flow**:
1. User has an instrument (DMM_34401A) already configured with a `voltage_reading` state variable bound to the read_voltage command.
2. User drags a "Data Logger" widget from the Lab Widgets palette onto the canvas.
   - Data Logger widget appears with default layout: status label + Start/Stop/Pause buttons.
3. User selects the Data Logger widget.
   - Properties panel shows logger-specific properties.
4. User configures:
   - Sources: selects `voltage_reading` from dropdown (multi-select supported for multiple variables).
   - Log Format: "CSV"
   - File Path: "./logs/voltage_data.csv"
   - Interval: 1000 (ms)
   - Max File Size: 10 (MB)
   - Max Files: 7
5. User clicks "Run Preview" and runs the generated `.py`.
6. In the running app, user clicks "Start Logging" button on the Data Logger widget.
   - Logging begins. CSV file created at specified path.
   - Every 1 second, a new row is appended: timestamp, voltage_value.
7. When file exceeds 10MB, rotation occurs: new file created with timestamp suffix, old file preserved.
8. When 8 files exist, oldest is deleted.

**Edge cases**:
- File path is invalid/directory doesn't exist: Generated code includes `os.makedirs` to create directories.
- Disk full: Logger catches `OSError`, logs error, continues attempting.
- Source variable deleted: Widget shows error state. Code generation includes safety check.

---

#### Flow E: Alarm Configuration

**Objective**: User sets up an over-voltage alarm with visual flash and log actions.

**Flow**:
1. User has `voltage_reading` state variable with values from a DMM.
2. User drags an "Alarm Indicator" widget from Lab Widgets palette.
3. User selects the Alarm Indicator.
   - Properties panel shows alarm configuration.
4. User configures:
   - Condition: "Greater Than"
   - Threshold: 250.0
   - Source Variable: `voltage_reading`
   - Severity: "critical"
   - Flash Interval: 500 (ms)
   - Actions:
     - Action 1: Type "Visual", Target Widget: voltage_label, Flash Color: #f38ba8 (pink)
     - Action 2: Type "Log", Log Level: "warning", Message: "ALARM: Voltage {value}V exceeds threshold {threshold}V"
   - Hysteresis: Enabled, Reset Threshold: 240.0
   - Cooldown: 5000 (ms)
5. User clicks "Run Preview" and runs the `.py`.
6. When `voltage_reading` exceeds 250.0:
   - Alarm triggers. Voltage label flashes pink every 500ms.
   - Log entry written: "ALARM: Voltage 251.3V exceeds threshold 250.0V"
7. When voltage drops below 240.0 (hysteresis reset):
   - Alarm resets. Flashing stops. Label returns to normal color.
8. If voltage oscillates between 240 and 250:
   - Alarm does NOT re-trigger due to hysteresis and cooldown.

**Edge cases**:
- Source variable is deleted: Alarm shows error. Code generation skips with comment.
- Widget target for visual action is deleted/hidden: Visual action is skipped, other actions still execute.
- Cooldown active: Alarm condition met but within cooldown period → no action. Log: "Alarm condition met but cooldown active."


---

### 2.4 UI Component Specifications

#### 2.4.1 Header Bar

The header bar spans the full width at the top, 48px height, fixed position, z-index 100. Background `#11111b` with a 1px `#313244` bottom border. Uses flexbox with `justify-content: space-between`.

**Left group**: App logo (24px SVG wrench+gauge icon + "LabGUI" in 16px/600 `#cdd6f4`), project name (inline-editable, shows "*" when unsaved), save status dot (8px circle: green/yellow/red).

**Center group**: Undo/Redo buttons (20px curved arrows, disabled when stack empty), separator, zoom controls (label showing current %, in/out buttons, fit-to-screen), separator, snap-to-grid toggle (grid icon with pressed state indicator), show-grid toggle (dot-grid icon).

**Right group**: Run Preview button (primary: `#89b4fa` bg, `#1e1e2e` text, play icon + label), Export button (secondary: transparent bg, border, download icon + label), Settings gear icon, panel toggle buttons (left/right/bottom).

All header buttons are 32x32px with hover state `#313244` background, 4px border-radius. Tooltips show on hover with keyboard shortcuts.

---

#### 2.4.2 Left Sidebar — Widget Palette

**Structure**: Two tabs at top (tab bar height 36px). Tab 1: Widgets (puzzle-piece icon). Tab 2: Templates (layout-grid icon).

**Widget Palette Tab**:
- **Categories** as collapsible accordions: Containers, Basic Widgets, Lab Widgets.
- **Category header**: `#45475a` background, 28px height, 12px bold white text, chevron icon for expand/collapse.
- **Widget items**: 56px tall rows. 20px icon centered + label text (12px `#cdd6f4`). Hover: background `#313244`, left border 2px `#89b4fa`.
- **Drag behavior**: Mousedown creates ghost element at 50% opacity following cursor. Drop on canvas creates widget.
- **Search input**: 28px at top. Placeholder "Search widgets...". Real-time filter matching name and category.

**Template Gallery Tab**:
- **Grid layout**: 2 columns, 8px gap.
- **Template cards**: 108x80px. 80px thumbnail + 20px title. Hover: border `#89b4fa`. Click: loads template.
- **Templates**: Multimeter Readout, Serial Monitor, Data Logger, Calibration UI, Oscilloscope Display, PID Controller Panel, Empty Project.

---

#### 2.4.3 Center Canvas

**Visual layers** (bottom to top):
1. **Background layer**: `#1e1e2e` fill.
2. **Grid layer**: Dotted grid at snap interval. Dots are 1px `#313244`.
3. **Window boundary**: Dashed rectangle (`#585b70`, 2px, 8px dash) showing tkinter root bounds. Resize handles adjust window size.
4. **Widget layer**: Absolutely-positioned DOM divs for each widget. Rendered in paint order (array order = z-index).
5. **Overlay layer** (HTML5 Canvas 2D): Selection bounding boxes, resize handles, smart guides, marquee rectangle, drag ghosts.

**Coordinate system**: Canvas space is infinite. Widget positions stored as `(x, y, width, height)` with (0,0) at top-left of tkinter root window. All coordinates in pixels.

**Zoom**: CSS `transform: scale()` on widget container. Range 25-300%. Mouse-wheel zoom toward cursor position.

**Pan**: Middle-mouse drag or Spacebar+drag. Scrollbars appear when content extends beyond viewport.

---

#### 2.4.4 Right Sidebar — Properties Panel

**Tab bar**: 36px height. Four tabs: Properties (default), Widget Tree, State Variables, Instruments. Each tab has an icon + label (label hidden in collapsed mode).

**Properties Tab (contextual)**:
- **No selection**: Window properties — Title, Size (W x H), Position, Resizable checkboxes, Background color, Icon path.
- **Single widget**: Sections: Geometry (X, Y, W, H, anchor selector), Layout (for grid children: row, col, rowspan, sticky, pad), Appearance (text, font, colors, border, relief), Behavior (state, focus, command, tab order), Data Binding (variable dropdown, instrument dropdown, transform).
- **Multi-select**: Shared properties only. Mixed values show "—".

**Property input types**:
| Type | UI | Details |
|------|-----|---------|
| Integer | Number input +/- | Step 1px, Ctrl+click for 10px. Min/max bounds. |
| Float | Number input | 2 decimal places. |
| String | Text input | Max length per property. |
| Color | Color swatch + hex input | 20px swatch. Click opens picker. Preset palette. |
| Font | Family dropdown + size + weight | System fonts list. 6-72px range. |
| Dropdown | Select with search | Filterable. |
| Boolean | Toggle switch | 32px wide. |
| Anchor | 3x3 dot grid | Click to set anchor point. |
| Sticky | Directional toggles | N, S, E, W, NE, NW, SE, SW, CENTER. |

---

#### 2.4.5 Right Sidebar — Widget Tree Panel

**Structure**: Hierarchical tree with indentation.

**Per-widget row**: Eye icon (visibility) + Lock icon + Type icon (16px) + Name (editable on double-click) + Type label (muted).

**Visibility**: Eye-open = visible. Eye-crossed = hidden (ghosted on canvas at 20% opacity, excluded from generated code).

**Lock**: Lock-closed = locked (cannot select/move). Lock-open = unlocked. Lock badge on canvas.

**Interactions**: Click to select. Ctrl+click for multi-select. Drag to reorder (changes z-index). Drag onto container to reparent. Right-click for context menu.

---

#### 2.4.6 Right Sidebar — State Variables Panel

**Add button**: "+ Add Variable" at top.

**Variable row**: Name (monospace) + Type badge (`str`/`int`/`float`/`bool` in colored badges) + Default value + Bind count + Edit/Delete icons.

**Expandable**: Click to see bound widgets list (clickable links) and current value.

**Validation**: Names must be valid Python identifiers. Duplicate names rejected.

---

#### 2.4.7 Right Sidebar — Instruments Panel

**Add button**: "+ Add Instrument" at top.

**Instrument row**: Name + Type badge (`VISA`/`SERIAL`/`MOCK`) + Connection string + Status dot (gray/green/red) + Expand chevron.

**Expanded detail**: Commands table (Name | Send | Parse | Test button), Polling config, Bound widgets list.

**Test button**: Sends identity query, displays response in toast.

---

#### 2.4.8 Bottom Panel — Code Panel

**Read-only** code display with Python syntax highlighting. Monaco Editor component.

**Features**: Line numbers, auto-scroll to selected widget's code, "Copy All" button, word wrap toggle.

**Update**: Debounced 500ms. "Updating..." spinner during regeneration.

**Validation**: Green checkmark (AST parse passes) or red X with error tooltip.

**Empty state**: Comment: `# Create widgets on the canvas to see generated code here.`

---

#### 2.4.9 Modals

**New Project Modal**: Template gallery (2-column grid, 160x120px cards) + Recent projects list + Create/Cancel buttons.

**Export Modal**: Filename input, Code style radio (flat/class), Checkboxes (docstrings, type hints, instrument init, data logging, minimize imports), 15-line preview, Export .py / Copy / Close buttons.

**Instrument Config Modal**: Tabbed (Connection/Commands/Polling). Connection: name, type (VISA/Serial/Mock), type-specific fields. Commands: editable table. Polling: enable toggle, interval, error handling.

**State Variable Editor Modal**: Name (validated), Type dropdown, Default value, Format string, Description. Save/Cancel.

**Settings Modal**: Tabbed (General/Canvas/Code Generation). Theme, auto-save, grid defaults, export defaults.

---

### 2.5 Keyboard Shortcuts

#### 2.5.1 Global Shortcuts

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
| `Escape` | Close modal / deselect all / cancel operation | Global | P0 |

#### 2.5.2 Canvas Shortcuts

| Shortcut | Action | Details | Priority |
|----------|--------|---------|----------|
| `Delete` | Delete selected widget(s) | Confirmation for >3 items or containers with children | P0 |
| `Ctrl+C` | Copy selected widget(s) | Serialized to clipboard + localStorage | P0 |
| `Ctrl+X` | Cut selected widget(s) | Remove from canvas, add to clipboard | P0 |
| `Ctrl+V` | Paste from clipboard | At mouse position, or +20,+20 from original | P0 |
| `Ctrl+D` | Duplicate selected widget(s) | Offset +10,+10 from original | P0 |
| `Ctrl+A` | Select all widgets | All widgets selected | P0 |
| `Ctrl+G` | Group selected widget(s) | Creates group. Max nesting depth: 3 | P1 |
| `Ctrl+Shift+G` | Ungroup selected group(s) | Children become independent | P1 |
| `Arrow keys` | Nudge 1px | Directional. Snap applied. | P0 |
| `Shift+Arrow keys` | Nudge 10px | Configurable amount in settings | P0 |
| `Ctrl+Up/Down` | Bring Forward / Send Backward | Change z-order by 1 | P1 |
| `Ctrl+Shift+Up/Down` | Bring to Front / Send to Back | Move to top/bottom | P1 |
| `Ctrl+mousewheel` | Zoom in/out | 10% increments. Origin at cursor | P0 |
| `Spacebar + drag` | Pan canvas | Cursor: grab/grabbing | P0 |
| `0` | Zoom to 100% | Resets zoom | P1 |
| `Ctrl+0` | Fit to screen | All widgets fit + 20px padding | P1 |
| `G` | Toggle snap-to-grid | Quick toggle | P1 |
| `H` | Toggle grid visibility | Quick toggle | P1 |

#### 2.5.3 Widget Tree Shortcuts

| Shortcut | Action | Priority |
|----------|--------|----------|
| `Up/Down` | Navigate rows | P1 |
| `Right` | Expand container | P1 |
| `Left` | Collapse container | P1 |
| `Space` | Toggle selection | P1 |
| `F2` | Rename focused widget | P1 |

#### 2.5.4 Properties Panel Shortcuts

| Shortcut | Action | Priority |
|----------|--------|----------|
| `Tab` | Next field | P0 |
| `Shift+Tab` | Previous field | P0 |
| `Enter` | Commit value | P0 |
| `Escape` | Cancel edit | P0 |

---

### 2.6 Progressive Disclosure Design

The UI surfaces complexity gradually based on user experience level and project state. This prevents overwhelming first-time users while providing full power to experienced users.

#### 2.6.1 First Launch Experience

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

**Transition**: User selects a template and clicks "Create", OR manually dismisses the welcome and creates an empty project.

#### 2.6.2 First Project Active

**Trigger**: User has created/opened a project and is on the canvas.

**UI State**:
- **Simplified palette**: All categories visible but Lab Widgets collapsed by default.
- **Right sidebar**: "Properties" and "Widget Tree" tabs visible. "State Variables" and "Instruments" still hidden.
- **Contextual hints**: First time user drags a widget, toast: "Widget added! Edit its properties in the right panel."
- **First property edit**: Subtle highlight pulse on Properties panel.
- **Run Preview button**: Subtle pulse animation after 3rd widget added.
- **No code panel**: Bottom panel stays collapsed.

**Transition**: User clicks "Run Preview" for the first time, OR adds 5+ widgets, OR has been active for 10+ minutes.

#### 2.6.3 Intermediate User

**Trigger**: User has completed at least one export/preview cycle. Flag stored in localStorage: `labgui_has_exported=true`.

**UI State**:
- **Full palette**: All categories expanded. Lab Widgets visible.
- **All right sidebar tabs visible**: Properties, Widget Tree, State Variables, Instruments.
- **State Variables tab**: Shows "Getting Started" tip: "State variables let widgets share data. Try adding one!" with quick-add button.
- **Instruments tab**: Shows "Getting Started" tip: "Connect to lab instruments for live data. Add your first instrument!" with quick-add button.
- **Bottom panel**: Code tab becomes available. "Unlock the code panel" hint after 2nd export.
- **Keyboard shortcut hints**: Tooltips include shortcuts.

**Transition**: User adds first instrument OR adds first state variable. Flag: `labgui_has_used_advanced=true`.

#### 2.6.4 Advanced User (Power Mode)

**Trigger**: User has added an instrument or state variable, OR explicitly enabled "Power Mode" in settings.

**UI State**:
- **All panels visible and accessible**: No hidden tabs, no restrictions.
- **Code panel**: Available and suggested.
- **Instruments panel auto-opens**: When first instrument is added, right sidebar switches to Instruments tab (one time).
- **State panel auto-opens**: When first state variable is added, sidebar switches to State Variables tab (one time).
- **Advanced properties**: "Data Binding" section always visible in Properties panel.
- **No onboarding hints**: All tips dismissed permanently.
- **Settings access**: Full settings modal.

#### 2.6.5 Feature Discovery Triggers

| Action | Discovery Event | UI Response |
|--------|----------------|-------------|
| First drag from palette | Widget creation | Toast: "Tip: Double-click text widgets to edit inline" |
| First multi-select | Multi-selection | Toast: "Tip: Change properties for all selected widgets at once" |
| First resize | Resize | Size tooltip shown prominently |
| First property change | Properties confirmed | Brief highlight on canvas widget |
| 3rd widget added | Run Preview suggested | Subtle pulse on Run Preview button |
| First preview export | Export flow completed | Toast: "Great! Try adding instrument bindings." |
| 10+ minutes activity | Intermediate unlocked | "State Variables" and "Instruments" tabs fade in |
| First instruments panel open | Instrument binding | Highlight "+ Add Instrument" button |
| First state panel open | State variables | Highlight "+ Add Variable" button |

#### 2.6.6 Settings for Disclosure Control

In Settings > General:
- **Experience Level**: dropdown — Auto (default), Beginner, Intermediate, Advanced
  - Beginner: Simplified palette, hidden advanced tabs, maximum hints
  - Intermediate: Full palette, visible tabs, moderate hints
  - Advanced: Everything visible, no hints, code panel auto-shown
- **Reset Onboarding**: button — Resets all discovery flags
- **Show Tooltips**: toggle (default ON)
- **Show Code Panel by Default**: toggle (default OFF for beginner, ON for advanced)


---

## 3. Technical Architecture

### 3.1 Technology Stack

| Layer | Technology | Version | Justification |
|-------|-----------|---------|---------------|
| **Framework** | React | 18.x | Concurrent Features enable background code generation without blocking UI interactions. Suspense for lazy-loaded panels. |
| **Language** | TypeScript | 5.3+ (strict) | Type-safe widget definitions, code generation AST structures, and IR schemas. Prevents runtime errors in a design tool where data shapes are complex. |
| **Build Tool** | Vite | 5.x | Sub-second HMR critical for rapid UI iteration. Optimized static builds with tree-shaking, code splitting, and asset optimization for deployment to GitHub Pages. |
| **Styling** | Tailwind CSS | 3.4 | Utility-first approach prevents CSS file proliferation in a panel-dense UI. Dark theme tokens (colors, spacing) defined in config. |
| **State Management** | Zustand | 4.4 | Minimal API (< 1KB). Selector-based subscriptions ensure only components consuming specific state re-render. Critical for canvas performance during drag. Supports Immer for immutable updates. |
| **Drag & Drop** | @dnd-kit | 6.x | Modern, accessible DnD. Modular architecture (core, sortable, utilities). Pointer sensor for canvas widget drag. Keyboard sensors for accessibility. Collision detection for drop targets. |
| **Code Editor** | Monaco Editor | latest | Same editor as VS Code. Python syntax highlighting, line numbers, minimap. Read-only display of generated code. Auto-scroll to widget code blocks. |
| **Canvas Overlay** | HTML5 Canvas 2D API | Native | Overlay layer for selection decorations, resize handles, smart guides, grid rendering, and marquee selection. Imperative API for 60fps rendering without React reconciliation overhead. |
| **DOM Canvas** | React + CSS | Native | Widgets render as absolutely-positioned DOM divs. Native event handling, CSS styling, accessibility. CSS `transform: scale()` for zoom, `transform: translate()` for pan. |
| **Undo/Redo** | Immer + Patches | 10.x | Immutable state updates via `produce()`. Patches capture fine-grained changes for undo history (200 entries). `applyPatches()` for redo. Compresses rapid operations (e.g., drag). |
| **ID Generation** | nanoid | 4.x | Small, fast, URL-friendly unique IDs for widgets and variables. Collision-resistant. |
| **Validation** | Zod | 3.x | Runtime schema validation for IR JSON. Validates project files on open, widget properties on edit, instrument configs on save. Type inference for TypeScript interfaces. |
| **HTTP** | Native Fetch | Native | Only needed for loading templates (static JSON files). No other network requests in pure client-side architecture. |
| **Icons** | Lucide React | 0.x | Lightweight, consistent icon set. Tree-shakeable — only imported icons included in bundle. |
| **Testing** | Vitest | 1.x | Same test runner as Vite. Unit tests for code generation, state management, coordinate math. Fast, watch-mode enabled. |
| **Hosting** | GitHub Pages | - | Free static hosting with HTTPS and custom domain support. CI/CD via GitHub Actions. |

**Bundle strategy**: Code splitting via Vite `manualChunks` — vendor (React, Zustand, Immer), dnd (@dnd-kit), editor (Monaco), utils (nanoid, Zod). Vendor chunk always loaded; DnD and editor chunks loaded on demand.

---

### 3.2 Component Hierarchy

```
App.tsx (root, providers)
├── AppLayout.tsx (CSS Grid layout)
│   ├── Header.tsx
│   │   ├── Logo.tsx
│   │   ├── ProjectName.tsx (editable)
│   │   ├── SaveIndicator.tsx
│   │   ├── Toolbar.tsx (undo/redo, zoom, snap, grid)
│   │   ├── RunPreviewButton.tsx
│   │   ├── ExportButton.tsx
│   │   ├── SettingsButton.tsx
│   │   └── PanelToggles.tsx
│   ├── LeftSidebar.tsx (240px, collapsible)
│   │   ├── SidebarTabs.tsx (Widgets | Templates)
│   │   ├── WidgetPalette.tsx
│   │   │   └── WidgetCategory.tsx (collapsible)
│   │   │       └── DraggableWidgetItem.tsx
│   │   └── TemplateGallery.tsx
│   │       └── TemplateCard.tsx
│   ├── CanvasArea.tsx (flexible, main design surface)
│   │   ├── GridOverlay.tsx (Canvas 2D, grid dots)
│   │   ├── WindowBoundary.tsx (dashed rectangle)
│   │   ├── WidgetContainer.tsx (zoomed/panned transform)
│   │   │   └── CanvasWidget.tsx (one per widget, memoized)
│   │   │       ├── WidgetWireframe.tsx (DOM, widget-specific)
│   │   │       └── InlineEditor.tsx (conditional, text widgets)
│   │   ├── SelectionOverlay.tsx (Canvas 2D, handles/boxes)
│   │   ├── SmartGuides.tsx (Canvas 2D, alignment guides)
│   │   └── MarqueeOverlay.tsx (Canvas 2D, selection rect)
│   ├── RightSidebar.tsx (280px, tabbed)
│   │   ├── PropertiesPanel.tsx (contextual)
│   │   │   ├── WindowProperties.tsx (no selection)
│   │   │   └── WidgetProperties.tsx (single/multi)
│   │   │       ├── GeometrySection.tsx
│   │   │       ├── AppearanceSection.tsx
│   │   │       ├── BehaviorSection.tsx
│   │   │       └── BindingSection.tsx
│   │   ├── WidgetTreePanel.tsx
│   │   │   └── WidgetTreeItem.tsx (recursive, DnD sortable)
│   │   ├── StateVariablesPanel.tsx
│   │   │   └── StateVariableRow.tsx
│   │   └── InstrumentsPanel.tsx
│   │       └── InstrumentRow.tsx
│   └── BottomPanel.tsx (collapsible, max 300px)
│       ├── CodePanel.tsx (Monaco Editor, read-only)
│       └── EventLogPanel.tsx
├── Modals (portal-rendered, overlay)
│   ├── NewProjectModal.tsx
│   ├── ExportModal.tsx
│   ├── InstrumentConfigModal.tsx
│   ├── StateVariableEditorModal.tsx
│   └── SettingsModal.tsx
├── Toasts.tsx (notification container)
└── WelcomeOverlay.tsx (first-launch, conditional)
```

**Key architectural patterns**:
- **Container/Presentational split**: Layout components (AppLayout, CanvasArea) manage structure. Panel components manage their own concerns. Widget rendering is fully presentational.
- **Memoization strategy**: `CanvasWidget` is wrapped in `React.memo()` with widget ID comparison. Only re-renders when: its own properties change, selection state changes, zoom changes. Parent `CanvasArea` uses viewport culling to skip off-screen widgets entirely.
- **Portal rendering**: All modals render via React Portal to `<div id="modals">` outside the main DOM tree, ensuring proper z-index stacking above all UI layers.
- **Conditional rendering**: `WelcomeOverlay` only renders when `localStorage.getItem('labgui_welcomed')` is null. Advanced tabs (State Variables, Instruments) conditionally rendered based on `experienceLevel` setting and `hasUsedAdvanced` flag.

---

### 3.3 State Management Architecture

#### 3.3.1 Store Design

Three Zustand stores with distinct responsibilities:

**1. projectStore** — Project data (serializable to IR)
```typescript
interface ProjectStore {
  project: ProjectIR;           // Entire IR document (widgets, variables, instruments, etc.)

  // Widget CRUD
  addWidget: (widget: WidgetIR) => void;
  updateWidget: (id: string, updates: Partial<WidgetIR>) => void;
  deleteWidget: (id: string) => void;  // Cascade: removes children, bindings
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, w: number, h: number) => void;
  reparentWidget: (id: string, parentId: string | null) => void;
  reorderWidget: (id: string, newIndex: number) => void;

  // Selection
  selectedIds: Set<string>;
  selectWidget: (id: string, multi?: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // Window
  setWindowTitle: (title: string) => void;
  setWindowSize: (w: number, h: number) => void;

  // State variables
  addStateVariable: (sv: StateVariableIR) => void;
  updateStateVariable: (name: string, updates: Partial<StateVariableIR>) => void;
  deleteStateVariable: (name: string) => void;  // Cascade: unbinds widgets

  // Instruments
  addInstrument: (inst: InstrumentIR) => void;
  updateInstrument: (name: string, updates: Partial<InstrumentIR>) => void;
  deleteInstrument: (name: string) => void;

  // Data loggers
  addDataLogger: (dl: DataLoggerIR) => void;
  updateDataLogger: (id: string, updates: Partial<DataLoggerIR>) => void;
  deleteDataLogger: (id: string) => void;

  // Alarms
  addAlarm: (alarm: AlarmIR) => void;
  updateAlarm: (id: string, updates: Partial<AlarmIR>) => void;
  deleteAlarm: (id: string) => void;

  // Project-level
  loadProject: (project: ProjectIR) => void;
  resetProject: () => void;

  // Computed
  getWidgetById: (id: string) => WidgetIR | undefined;
  getSelectedWidgets: () => WidgetIR[];
  getChildrenOf: (parentId: string) => WidgetIR[];
}
```

**2. uiStore** — UI state (non-serializable, session-scoped)
```typescript
interface UIStore {
  // Sidebar state
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  rightSidebarActiveTab: 'properties' | 'tree' | 'state' | 'instruments';
  bottomPanelOpen: boolean;
  bottomPanelActiveTab: 'code' | 'log';

  // Canvas state
  zoom: number;                 // 0.25 to 3.0
  panOffset: { x: number; y: number };
  snapToGrid: boolean;
  gridSize: number;             // 4, 8, 16, 32
  showGrid: boolean;
  showRulers: boolean;

  // Canvas interaction
  isDragging: boolean;
  isResizing: boolean;
  isPanning: boolean;
  activeHandle: ResizeHandle | null;
  dragStart: { x: number; y: number } | null;

  // Modals
  activeModal: ModalType | null;
  modalData: Record<string, unknown> | null;

  // Toasts
  toasts: Toast[];

  // Actions
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}
```

**3. clipboardStore** — Clipboard for copy/paste (session-scoped)
```typescript
interface ClipboardStore {
  widgets: WidgetIR[] | null;   // Serialized widgets (with new IDs on paste)
  copy: (widgets: WidgetIR[]) => void;
  paste: () => WidgetIR[] | null;  // Returns new widgets with fresh IDs and offset positions
}
```

#### 3.3.2 Update Patterns

**Direct updates** (simple property changes):
```typescript
// Properties panel calls this on every input change
projectStore.updateWidget(widgetId, { 
  properties: { text: 'New Label' } 
});
// Immer produce creates a new project object immutably
// Zustand notifies subscribers → React re-renders affected components
```

**Batch updates** (complex operations):
```typescript
// Multi-widget property change
projectStore.batchUpdate(selectedIds, { 
  style: { fontSize: 14 } 
});
// Single Immer produce call, single state update, single re-render cycle
```

**Undo integration**: Every mutating action in `projectStore` automatically captures Immer patches:
```typescript
// History middleware wraps the store
const useProjectStore = create<ProjectStore>()(
  historyMiddleware(undoMiddleware(immer((set, get) => ({
    updateWidget: (id, updates) => set((state) => {
      const widget = state.project.widgets.find(w => w.id === id);
      if (widget) Object.assign(widget, updates);
    });
  }))))
);
```

#### 3.3.3 State Flow Diagram

```
User Interaction
      │
      ▼
+-------------+     +-----------------+     +------------------+
|  UI Event   │────▶│  Store Action   │────▶│  Immer produce() │
|  (click,    │     │  (projectStore) │     │  (immutable      |
|   drag, key)│     │                 │     │   update)        |
+-------------+     +-----------------+     +------------------+
                                                    │
                              ┌─────────────────────┼─────────────────────┐
                              ▼                     ▼                     ▼
                        +----------+         +------------+       +--------------+
                        | React    │         | History    │       | Code Gen     |
                        | Re-render│         | (patches)  │       | (debounced)  │
                        │ (Canvas) │         │ (undo/redo)│       │ (Web Worker) │
                        +----------+         +------------+       +--------------+
                              │                                          │
                              ▼                                          ▼
                        +----------+                              +-----------+
                        | UI Update│                              | Monaco    |
                        │ (DOM)    │                              │ setValue()│
                        +----------+                              +-----------+
```

---

### 3.4 Module Boundaries

```
src/
├── main.tsx                          # Entry point, React root render
├── App.tsx                           # Root component, providers, global overlays
├── index.css                         # Tailwind directives, CSS variables, global styles
│
├── layout/                           # Layout components
│   ├── AppLayout.tsx                 # CSS Grid layout (header, sidebars, canvas, bottom)
│   ├── Header.tsx                    # Top bar with all controls
│   ├── LeftSidebar.tsx               # Collapsible left panel (240px)
│   ├── RightSidebar.tsx              # Tabbed right panel (280px)
│   └── BottomPanel.tsx               # Collapsible bottom panel
│
├── components/                       # Reusable UI components
│   ├── Button.tsx                    # Button variants (primary, secondary, icon, ghost)
│   ├── IconButton.tsx                # Square icon button with tooltip
│   ├── ToggleButton.tsx              # Pressed/unpressed state button
│   ├── Input.tsx                     # Text/number input with validation
│   ├── ColorPicker.tsx               # Color swatch + popover picker
│   ├── FontPicker.tsx                # Family dropdown + size + weight
│   ├── Dropdown.tsx                  # Filterable select with search
│   ├── ToggleSwitch.tsx              # On/off switch
│   ├── Tooltip.tsx                   # Hover tooltip with delay
│   ├── Toast.tsx                     # Individual toast notification
│   ├── ToastContainer.tsx            # Toast stack management
│   ├── Modal.tsx                     # Modal shell (overlay, centering, close)
│   ├── Accordion.tsx                 # Collapsible section (for property categories)
│   ├── SearchInput.tsx               # Search with clear button
│   └── Badge.tsx                     # Colored type/status badge
│
├── canvas/                           # Canvas rendering engine
│   ├── CanvasArea.tsx                # Main canvas container, event handlers
│   ├── CanvasWidget.tsx              # Individual widget renderer (memoized)
│   ├── WidgetContainer.tsx           # Zoomed/panned transform container
│   ├── GridOverlay.tsx               # Canvas 2D grid dots rendering
│   ├── WindowBoundary.tsx            # Dashed window bounds rectangle
│   ├── SelectionOverlay.tsx          # Canvas 2D selection boxes + handles
│   ├── SmartGuides.tsx               # Canvas 2D alignment guide lines
│   ├── MarqueeOverlay.tsx            # Canvas 2D marquee selection rectangle
│   ├── InlineEditor.tsx              # Text overlay for inline widget editing
│   ├── ContextMenu.tsx               # Right-click context menu (canvas + widget)
│   ├── clipboard.ts                  # Copy/paste logic
│   ├── coordinates.ts                # Screen/canvas space conversions
│   ├── snap.ts                       # Snap-to-grid algorithm
│   ├── hitTest.ts                    # Point-in-rect and handle detection
│   └── dragHandlers.ts               # Drag move/resize logic
│
├── widgets/                          # Widget wireframe renderers
│   ├── WidgetWireframe.tsx           # Base wireframe (handles selection state)
│   ├── renderers/                    # Per-widget-type wireframes
│   │   ├── LabelWireframe.tsx
│   │   ├── ButtonWireframe.tsx
│   │   ├── EntryWireframe.tsx
│   │   ├── FrameWireframe.tsx
│   │   ├── TextWireframe.tsx
│   │   ├── CheckbuttonWireframe.tsx
│   │   ├── RadiobuttonWireframe.tsx
│   │   ├── ScaleWireframe.tsx
│   │   ├── ListboxWireframe.tsx
│   │   ├── ComboboxWireframe.tsx
│   │   ├── SpinboxWireframe.tsx
│   │   ├── ProgressbarWireframe.tsx
│   │   ├── SeparatorWireframe.tsx
│   │   ├── GridContainerWireframe.tsx
│   │   ├── LabelFrameWireframe.tsx
│   │   ├── NotebookWireframe.tsx
│   │   ├── PanedWindowWireframe.tsx
│   │   ├── CanvasWireframe.tsx
│   │   ├── InstrumentReadoutWireframe.tsx
│   │   ├── SerialMonitorWireframe.tsx
│   │   ├── PlotCanvasWireframe.tsx
│   │   ├── DataLoggerWireframe.tsx
│   │   └── AlarmIndicatorWireframe.tsx
│   └── WidgetIcon.tsx                # Small icon for palette and tree
│
├── panels/                           # Sidebar panels
│   ├── WidgetPalette.tsx             # Left sidebar: draggable widget list
│   ├── TemplateGallery.tsx           # Left sidebar: template cards
│   ├── PropertiesPanel.tsx           # Right sidebar: contextual properties
│   ├── WidgetTreePanel.tsx           # Right sidebar: hierarchical tree
│   ├── StateVariablesPanel.tsx       # Right sidebar: variable list
│   ├── InstrumentsPanel.tsx          # Right sidebar: instrument list
│   ├── CodePanel.tsx                 # Bottom: Monaco code display
│   └── EventLogPanel.tsx             # Bottom: event log display
│
├── properties/                       # Property editor sections
│   ├── WindowProperties.tsx          # Window-level properties (no selection)
│   ├── WidgetProperties.tsx          # Single/multi widget properties
│   ├── GeometrySection.tsx           # X, Y, W, H, anchor
│   ├── LayoutSection.tsx             # Grid row, col, sticky, pad
│   ├── AppearanceSection.tsx         # Text, font, colors, border, relief
│   ├── BehaviorSection.tsx           # State, focus, command, tab order
│   └── BindingSection.tsx            # Variable binding, instrument binding, transform
│
├── modals/                           # Modal dialogs
│   ├── NewProjectModal.tsx
│   ├── ExportModal.tsx
│   ├── InstrumentConfigModal.tsx
│   ├── StateVariableEditorModal.tsx
│   └── SettingsModal.tsx
│
├── store/                            # Zustand stores
│   ├── projectStore.ts               # Project data (IR) + CRUD actions
│   ├── uiStore.ts                    # UI state (sidebar, zoom, modals)
│   ├── clipboardStore.ts             # Copy/paste buffer
│   └── historyMiddleware.ts          # Undo/redo patch capture
│
├── ir/                               # Intermediate Representation
│   ├── types.ts                      # TypeScript interfaces for all IR types
│   ├── schema.ts                     # Zod validation schemas
│   ├── factory.ts                    # Widget/state var/instrument factories
│   ├── defaults.ts                   # Default values per widget type
│   └── migrate.ts                    # Version migration (IR v1 → v2, etc.)
│
├── generators/                       # Code generation
│   └── tkinter/
│       ├── TkinterGenerator.ts       # Main generator class
│       ├── WidgetVisitors.ts         # Per-widget-type code emitters
│       ├── LayoutEmitter.ts          # place() / grid() / pack() logic
│       ├── StateVariableEmitter.ts   # StringVar/IntVar/DoubleVar/BooleanVar
│       ├── InstrumentEmitter.ts      # VISA/Serial initialization
│       ├── CommandEmitter.ts         # Per-command query methods
│       ├── DataLoggerEmitter.ts      # Data logging thread
│       ├── AlarmEmitter.ts           # Alarm monitoring thread
│       ├── CleanupEmitter.ts         # Resource cleanup (close instruments, join threads)
│       ├── ImportCollector.ts        # Conditional import resolution
│       └── CodeBuilder.ts            # String builder with indentation management
│
├── workers/                          # Web Workers
│   └── codeGenerator.worker.ts       # Runs TkinterGenerator off main thread
│
├── hooks/                            # Custom React hooks
│   ├── useCodeGeneration.ts          # Debounced trigger + Web Worker
│   ├── useKeyboardShortcuts.ts       # Global shortcut registration
│   ├── useAutoSave.ts                # localStorage auto-save
│   ├── useFileHandling.ts            # Open/Save .gui.json via File System Access API
│   ├── useUndoRedo.ts               # Keyboard shortcut integration
│   ├── useViewportCulling.ts        # Only render visible widgets
│   ├── useResizeObserver.ts         # Track element dimensions
│   └── useDebounce.ts               # Generic debounce hook
│
├── utils/                            # Utilities
│   ├── coordinates.ts               # Screen/canvas/world conversions
│   ├── snap.ts                      # Snap-to-grid math
│   ├── color.ts                     # Hex, RGB, HSL conversions
│   ├── id.ts                        # nanoid wrapper with prefixes
│   ├── validators.ts                # Python identifier regex, hex color, etc.
│   ├── localStorage.ts              # Typed localStorage wrapper
│   └── fileSystemAccess.ts          # File System Access API wrapper with fallback
│
├── constants/                        # Constants and config
│   ├── widgetCatalog.ts             # Widget definitions, default sizes, properties
│   ├── templates.ts                 # Built-in template definitions
│   ├── instrumentDefaults.ts        # Default VISA/Serial configs
│   └── theme.ts                     # Color tokens, spacing, typography
│
└── types/                            # Global TypeScript types
    ├── widgets.ts                    # WidgetType, WidgetIR, WidgetStyle, etc.
    ├── project.ts                    # ProjectIR, Metadata, CanvasState
    ├── instruments.ts                # InstrumentIR, CommandIR, Protocol
    ├── state.ts                      # StateVariableIR, VarType
    ├── logging.ts                    # DataLoggerIR, LogFormat
    ├── alarms.ts                     # AlarmIR, ConditionType, ActionType
    └── common.ts                     # Point, Rect, Size, etc.
```

---

### 3.5 Canvas Rendering Engine

#### 3.5.1 Three-Layer Architecture

The canvas uses a hybrid rendering approach with three visual layers:

**Layer 1: Background (DOM + CSS)**
- Canvas area background: CSS `background-color: var(--canvas-bg)`
- Grid overlay: HTML5 Canvas 2D (for performance with thousands of dots)
- Window boundary: SVG or CSS border

**Layer 2: Widgets (DOM)**
- Each widget renders as an absolutely-positioned `<div>`
- Position: `left: x * zoom + panX`, `top: y * zoom + panY`
- Size: `width: w * zoom`, `height: h * zoom`
- CSS `transform: scale(zoom)` applied to container for efficiency
- Each widget type has a React component for its wireframe appearance
- Events: mousedown (select/drag), mousemove (drag/resize), mouseup (commit)

**Layer 3: Overlay (HTML5 Canvas 2D)**
- Transparent `<canvas>` element absolutely positioned over everything
- Renders: selection bounding boxes, resize handles, smart guides, marquee rectangle, drag ghosts
- Uses Canvas 2D API for pixel-perfect, 60fps rendering
- No React reconciliation — direct imperative drawing

```
┌─────────────────────────────────────────────┐
│  Layer 3: Canvas 2D Overlay (transparent)   │
│  - Selection boxes (dashed blue)            │
│  - Resize handles (6x6 blue squares)        │
│  - Smart guides (yellow dashed lines)       │
│  - Marquee rectangle                        │
│  - Drag ghost                               │
├─────────────────────────────────────────────┤
│  Layer 2: Widget DOM Nodes                  │
│  - div widgets absolutely positioned        │
│  - Wireframe appearance per widget type     │
│  - CSS transform: scale(zoom) on container  │
├─────────────────────────────────────────────┤
│  Layer 1: Background                        │
│  - Solid background color                   │
│  - Canvas 2D grid dots                      │
│  - Window boundary dashed rectangle         │
└─────────────────────────────────────────────┘
```

#### 3.5.2 Coordinate Transformations

```
Screen Space (pixels, mouse events)
    │
    │  mouseEvent.offsetX, offsetY
    ▼
+--------------------------------+
│  screenToCanvas()              │
│  canvasX = (screenX - panX) / zoom  │
│  canvasY = (screenY - panY) / zoom  │
+--------------------------------+
    │
    ▼
Canvas Space (logical pixels, stored in IR)
    │
    │  widget.x, widget.y (canvas coordinates)
    ▼
+--------------------------------+
│  canvasToScreen()              │
│  screenX = canvasX * zoom + panX  │
│  screenY = canvasY * zoom + panY  │
+--------------------------------+
    │
    ▼
Screen Space (rendered position in DOM)
```

#### 3.5.3 Canvas 2D Overlay Rendering

The overlay canvas uses `requestAnimationFrame` for smooth 60fps updates:

```typescript
// src/canvas/CanvasOverlay.tsx

function renderOverlay(ctx: CanvasRenderingContext2D, state: OverlayState) {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.save();

  // Apply zoom and pan transform
  ctx.translate(panX, panY);
  ctx.scale(zoom, zoom);

  // Draw smart guides
  if (state.smartGuides.length > 0) {
    ctx.strokeStyle = '#f9e2af';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    for (const guide of state.smartGuides) {
      ctx.beginPath();
      ctx.moveTo(guide.x1, guide.y1);
      ctx.lineTo(guide.x2, guide.y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Draw selection boxes
  for (const sel of state.selections) {
    ctx.strokeStyle = '#89b4fa';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([2 / zoom, 2 / zoom]);
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);
    ctx.setLineDash([]);

    // Draw resize handles
    const handles = getHandlePositions(sel);
    for (const h of handles) {
      ctx.fillStyle = '#89b4fa';
      ctx.fillRect(h.x - 3/zoom, h.y - 3/zoom, 6/zoom, 6/zoom);
    }
  }

  // Draw marquee
  if (state.marquee) {
    ctx.fillStyle = 'rgba(137, 180, 250, 0.1)';
    ctx.fillRect(state.marquee.x, state.marquee.y, state.marquee.w, state.marquee.h);
    ctx.strokeStyle = '#89b4fa';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([2 / zoom, 2 / zoom]);
    ctx.strokeRect(state.marquee.x, state.marquee.y, state.marquee.w, state.marquee.h);
  }

  ctx.restore();
}
```

#### 3.5.4 Viewport Culling

For performance with 100+ widgets, only visible widgets are rendered:

```typescript
function useVisibleWidgets(
  widgets: WidgetIR[],
  viewport: { x: number; y: number; w: number; h: number },
  zoom: number
): WidgetIR[] {
  const margin = 100; // Overscan margin in screen pixels
  return useMemo(() => {
    return widgets.filter(w => {
      const screenX = w.x * zoom;
      const screenY = w.y * zoom;
      const screenW = w.width * zoom;
      const screenH = w.height * zoom;
      return (
        screenX < viewport.x + viewport.w + margin &&
        screenX + screenW > viewport.x - margin &&
        screenY < viewport.y + viewport.h + margin &&
        screenY + screenH > viewport.y - margin
      );
    });
  }, [widgets, viewport, zoom]);
}
```

#### 3.5.5 Widget Wireframe Rendering

Each widget type has a wireframe component that renders its tkinter appearance as a simplified DOM representation:

**Label wireframe**: A `<div>` with the configured text, font, colors, and alignment. Uses CSS `display: flex` with `align-items` and `justify-content` matching the tkinter `anchor` property.

**Button wireframe**: A `<div>` with border (matching `relief`), background color, text centered. On canvas: no click handler (canvas handles selection). Hover: subtle brightness change.

**Entry wireframe**: A `<div>` with border, background, and placeholder text showing the configured width.

**Frame wireframe**: A `<div>` with border (matching `relief` and `bd`), background color. Shows a subtle "Frame" label if empty.

**Container wireframes** (Frame, LabelFrame, Notebook, GridContainer, PanedWindow): Render children inside the container's bounds. Children positioned relative to parent container.

**Wireframe CSS**:
```css
.canvas-widget {
  position: absolute;
  box-sizing: border-box;
  pointer-events: auto; /* Enable mouse events for selection/drag */
  user-select: none;
}

.canvas-widget.selected {
  /* Selection styling handled by overlay canvas, not CSS */
}

.canvas-widget.hidden {
  opacity: 0.2;
  pointer-events: none;
}

.canvas-widget.locked::after {
  content: '';
  position: absolute;
  top: 4px;
  right: 4px;
  width: 12px;
  height: 12px;
  background: url(lock-icon.svg);
  opacity: 0.6;
}
```

---

### 3.6 Data Flow Architecture

#### 3.6.1 CRUD Operations on IR

**Add Widget Flow**:
```
User drags widget from palette
         │
         ▼
┌────────────────────┐
│ @dnd-kit onDragEnd │  Drop position in screen coordinates
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ screenToCanvas()   │  Convert to canvas space (undo zoom/pan)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ snapToGrid()       │  If snap enabled, round to nearest grid
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ ir/factory.ts      │  Create WidgetIR with defaults for type
│ createWidget()     │  Generate unique PEP8 name (button_1, ...)
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ projectStore.      │  Immer produces patches
│ addWidget()        │  History captures inverse patches
└────────┬───────────┘
         │
    ┌────┴────┐
    ▼         ▼
 Re-render  Trigger code
 CanvasWidget  generation
    │         (debounced 500ms)
    ▼
 CanvasWidget      ┌────────────────────┐
 component mounts  │ generateCode()     │
 with useEffect    │   IR → AST visitor │
 for initial focus │   → Python string  │
                   └────────┬───────────┘
                            │
                            ▼
                     Monaco editor
                     setValue()
```

**Move Widget Flow**:
```typescript
// Mousedown on widget → drag mode
// Mousemove → calculate delta from drag start
// Apply delta to original position
// Snap new position to grid (if enabled)
// Update DOM position directly (no React re-render during drag)
// On mouseup → commit position to projectStore
// Immer patches captured, undo entry created
// React re-renders with final position
// Code generation triggered (debounced)
```

**Edit Property Flow**:
```
User types in Properties Panel input
         │
         ▼
┌────────────────────┐
│ onChange handler   │  Debounced 100ms for text inputs
│ (instant for       │  Instant for dropdowns/checkboxes
│  dropdowns)        │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Validate input     │  Zod schema validation per property type
│ against schema     │  Show inline error if invalid
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ projectStore.      │  Single property update
│ updateWidget()     │  { properties: { [key]: value } }
└────────┬───────────┘
         │
    ┌────┴────┐
    ▼         ▼
  Immer    History
  patches  capture
    │
    ▼
CanvasWidget re-render
(only changed widget,
 memo prevents siblings)
    │
    ▼
Code generation triggered
(debounced 300ms)
```

**Delete Widget Flow**:
```typescript
// User presses Delete or clicks Delete in context menu
// Confirmation dialog if >3 widgets selected OR container with children
// If confirmed:
//   1. Remove widget(s) from project.widgets array
//   2. Cascade: remove all descendant widgets (children of containers)
//   3. Cascade: remove orphaned state variable bindings
//   4. Cascade: remove orphaned instrument bindings
//   5. Update selection state (clear if deleted was selected)
//   6. Immer patches captured, undo entry created
//   7. React re-renders
//   8. Code generation triggered
```

#### 3.6.2 Code Generation Pipeline

```
IR Change Detected
      │
      ▼
┌─────────────┐    Debounce 300ms (useDebounce)
│  useCode    │    Cancel pending generation
│ Generation  │    Start new timer
│   Hook      │
└──────┬──────┘
       │
       ▼
┌─────────────┐    Run in Web Worker (non-blocking)
│  Web Worker │    generators/tkinter/TkinterGenerator.ts
│  (async)    │
└──────┬──────┘
       │
       ▼
┌─────────────┐    Visitor Pattern
│   IR Walk   │    For each widget:
│   Visitor   │    1. Emit import statements
│             │    2. Create root window
│             │    3. Create widgets (bottom-up for containers)
│             │    4. Apply geometry (place())
│             │    5. Set properties
│             │    6. Bind variables
│             │    7. Attach event handlers
│             │    8. Main loop
└──────┬──────┘
       │
       ▼
┌─────────────┐    StringBuilder pattern
│   Python    │    PEP8 formatted output
│   String    │    Proper indentation (4 spaces)
│   Output    │    Line length <= 88 characters
└──────┬──────┘
       │
       ▼
┌─────────────┐    Post back to main thread
│  Monaco     │    editor.setValue(pythonCode)
│  setValue() │    Preserve scroll position if unchanged
└─────────────┘
```

**Web Worker Integration**:
```typescript
// src/hooks/useCodeGeneration.ts

export function useCodeGeneration() {
  const project = useProjectStore(s => s.project);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<number>(0);

  useEffect(() => {
    workerRef.current = new CodeGeneratorWorker();
    return () => workerRef.current?.terminate();
  }, []);

  const debouncedProject = useDebounce(project, 300);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;

    const requestId = ++pendingRef.current;
    worker.postMessage({ type: 'generate', requestId, project: debouncedProject });

    worker.onmessage = (event) => {
      const { requestId: responseId, code, error } = event.data;
      if (responseId < pendingRef.current) return; // Ignore stale responses
      if (error) { console.error('Code generation error:', error); return; }
      useUIStore.getState().setGeneratedCode(code);
    };
  }, [debouncedProject]);
}
```

#### 3.6.3 Persistence Flow

**Save Flow**:
```typescript
export async function saveProject(project: ProjectIR): Promise<boolean> {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const fileName = `${project.metadata.name}.gui.json`;

  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{ description: 'LabGUI Project', accept: { 'application/json': ['.gui.json'] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      if ((err as Error).name === 'AbortError') return false;
      console.warn('FSA API failed, falling back:', err);
    }
  }

  // Fallback: traditional download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  return true;
}
```

**Load Flow**: File System Access API → fallback to `<input type="file">` → parse JSON → Zod validation → migrate if needed → load into projectStore.

**Auto-Save Flow**: Zustand subscribe to project state → debounce 30 seconds → serialize to `localStorage` key `labgui_autosave` + timestamp. On app startup: check for auto-save data < 7 days old → offer recovery.

---

### 3.7 Performance Considerations

#### 3.7.1 Canvas Widget Rendering (100+ Widgets)

| Scenario | Optimization | Implementation |
|---|---|---|
| Widget drag | `transform: translate()` on DOM node | Direct style manipulation, no React re-render |
| Widget resize | Direct `width/height` style update | Debounced IR update at drag end |
| Property edit | `React.memo` on CanvasWidget | Shallow prop comparison |
| Zoom change | CSS `transform: scale()` on container | Single container transform |
| Pan change | CSS `transform: translate()` on container | Single container transform |
| Selection change | SelectionOverlay only | CanvasWidget re-render only for newly selected |
| New widget | Append to list | React key-based diff, only new widget mounts |
| Delete widget | Remove from list | React key-based diff, only removed widget unmounts |
| 100+ widgets | Viewport culling | Only render visible widgets (useVisibleWidgets hook) |

#### 3.7.2 Undo/Redo Memory Management

- **Max depth**: 200 entries (configurable).
- **Compression**: Rapid operations (drag at 60fps) merged into single entry.
- **Memory limit**: When estimated memory exceeds 50MB, prune oldest entries keeping every 10th as checkpoint.
- **Patch size**: Immer patches are tiny (only changed fields), not full snapshots.

#### 3.7.3 Code Generation Performance

- **Web Worker**: Generation runs off main thread, no UI blocking.
- **Debounce**: 300ms delay after last change before generation starts.
- **Request ID**: Stale responses ignored if newer request already sent.
- **StringBuilder**: Appends to array then joins once — no repeated string concatenation.

---

### 3.8 Browser APIs

| API | Usage | Fallback |
|-----|-------|----------|
| **File System Access API** | Save/load `.gui.json` files with native dialog | Traditional `<a download>` / `<input type="file">` |
| **localStorage** | Auto-save, preferences, recent projects, UI state | In-memory only (no persistence) |
| **Clipboard API** | Copy/paste widgets between projects | `document.execCommand('copy')` |
| **ResizeObserver** | Track canvas viewport dimensions for culling | Window `resize` event |
| **Web Workers** | Code generation off main thread | Main thread (synchronous, with loading spinner) |
| **Service Worker** | Offline caching, PWA installability | None (online-only) |
| **Fullscreen API** | Fullscreen canvas mode | None |

---

### 3.9 Deployment Architecture

#### 3.9.1 Build Pipeline

```
Developer push to main
         │
         ▼
┌─────────────────┐
│ GitHub Actions  │  .github/workflows/deploy.yml
│ CI/CD Pipeline  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 1. Checkout     │
│ 2. Setup Node   │  Node 20.x
│ 3. Install deps │  npm ci
│ 4. Type check   │  npx tsc --noEmit
│ 5. Lint         │  npx eslint src/
│ 6. Test         │  npx vitest run
│ 7. Build        │  npx vite build
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vite Build      │  Code splitting, tree shaking, minification
│                 │  Manual chunks: vendor, dnd, editor, utils
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ dist/ output    │  Static files for GitHub Pages
│                 │  - index.html
│                 │  - assets/*.js (chunked)
│                 │  - assets/*.css
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GitHub Pages    │  Branch: gh-pages
│ (Static hosting)│  HTTPS enabled
└─────────────────┘
```

#### 3.9.2 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'zustand', 'immer'],
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          editor: ['@monaco-editor/react', 'monaco-editor'],
          utils: ['nanoid', 'zod'],
        },
      },
    },
  },
  server: { port: 3000, open: true },
  base: '/',  // Set to '/repo-name/' for project pages
});
```

#### 3.9.3 No-Server Architecture

```
┌──────────────────────────────────────────────────────┐
│                    GitHub Pages                       │
│              (Static file hosting)                    │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐                  │
│  │ index.html  │    │ assets/     │                  │
│  │ (shell)     │    │ *.js chunks │                  │
│  └──────┬──────┘    └─────────────┘                  │
│         │                                             │
└─────────┼─────────────────────────────────────────────┘
          │ HTTPS
          │
┌─────────▼─────────────────────────────────────────────┐
│               User's Browser                          │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐                  │
│  │ React SPA   │    │ localStorage│  (auto-save)     │
│  │ (client)    │    │             │                  │
│  │             │    ├─────────────┤                  │
│  │ ┌─────────┐ │    │ Clipboard   │  (copy/paste)    │
│  │ │ Zustand │ │    │ API         │                  │
│  │ │ Stores  │ │    ├─────────────┤                  │
│  │ └────┬────┘ │    │ File System │  (save/load)     │
│  │      │      │    │ Access API  │                  │
│  │ ┌────▼────┐ │    ├─────────────┤                  │
│  │ │ Canvas  │ │    │ Web Worker  │  (code gen)      │
│  │ │ Engine  │ │    │             │                  │
│  │ └─────────┘ │    └─────────────┘                  │
│  │             │                                     │
│  │ ┌─────────┐ │    NO BACKEND REQUIRED              │
│  │ │ Monaco  │ │    NO DATABASE                      │
│  │ │ Editor  │ │    NO CLOUD SERVICES                │
│  │ └─────────┘ │    NO API SERVER                    │
│  └─────────────┘                                     │
└───────────────────────────────────────────────────────┘
```

**Key benefits**: Zero hosting cost, zero maintenance, no uptime to monitor, no API keys to manage, no user data on servers (full privacy), works offline after first load, no backend security concerns.


---

---

## 4. IR Schema & Code Generation

### 4.1 Complete IR Schema

The Intermediate Representation (IR) is a JSON document (`.gui.json`) that serves as the single source of truth for every project. All application state is derived from the IR, and the IR is the only format that round-trips (can be saved and re-opened). Generated `.py` files are one-way, disposable build artifacts.

#### 4.1.1 Core TypeScript Interfaces

```typescript
// src/ir/types.ts

export type WidgetType =
  | 'Label' | 'Button' | 'Entry' | 'Text' | 'Frame' | 'Canvas'
  | 'Listbox' | 'Scale' | 'Checkbutton' | 'Radiobutton' | 'Combobox'
  | 'Spinbox' | 'Progressbar' | 'Separator' | 'LabelFrame' | 'Notebook'
  | 'PanedWindow' | 'GridContainer'
  | 'InstrumentReadout' | 'SerialMonitor' | 'PlotCanvas'
  | 'DataLogger' | 'AlarmIndicator';

export type VarType = 'string' | 'int' | 'float' | 'bool';
export type Protocol = 'visa' | 'serial' | 'tcp' | 'mock';
export type LayoutMethod = 'place' | 'grid' | 'pack';

export interface Point { x: number; y: number; }
export interface Size { width: number; height: number; }

export interface WidgetStyle {
  bg?: string;
  fg?: string;
  font_family?: string;
  font_size?: number;
  font_weight?: 'normal' | 'bold';
  font_slant?: 'roman' | 'italic';
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge' | 'solid';
  border_width?: number;
  border_color?: string;
  cursor?: string;
}

export interface WidgetBinding {
  variable?: string;
  instrument?: string;
  channel?: string;
  transform?: string;
}

export interface WidgetIR {
  id: string;
  type: WidgetType;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  locked: boolean;
  parent_id?: string | null;
  z_index: number;
  properties: Record<string, unknown>;
  style: WidgetStyle;
  binding?: WidgetBinding | null;
  command?: string;
  tooltip?: string;
}

export interface StateVariableIR {
  name: string;
  var_type: VarType;
  default_value: unknown;
  format?: string;
  min?: number;
  max?: number;
  description?: string;
}

export interface CommandIR {
  name: string;
  display_name?: string;
  send: string;
  parse_type: 'float' | 'int' | 'string' | 'regex' | 'bytes' | 'json' | 'none';
  parse_expression?: string;
  transform?: string;
  unit?: string;
  display_format?: string;
  timeout_ms?: number;
}

export interface PollingConfig {
  enabled: boolean;
  interval_ms: number;
  commands: string[];
  on_error: 'continue' | 'stop' | 'retry_3x';
}

export interface InstrumentIR {
  name: string;
  protocol: Protocol;
  enabled: boolean;
  resource_string?: string;
  backend?: string;
  timeout_ms?: number;
  read_termination?: string;
  write_termination?: string;
  port?: string;
  baudrate?: number;
  bytesize?: number;
  parity?: 'N' | 'E' | 'O' | 'M' | 'S';
  stopbits?: number;
  flow_control?: 'none' | 'xonxoff' | 'rtscts' | 'dsrdtr';
  commands: CommandIR[];
  polling: PollingConfig;
}

export interface LogSource {
  variable: string;
  column_name?: string;
  format?: string;
}

export interface DataLoggerIR {
  id: string;
  name: string;
  enabled: boolean;
  sources: LogSource[];
  format: 'csv' | 'json';
  file_path: string;
  interval_ms: number;
  include_timestamp: boolean;
  timestamp_format: 'ISO8601' | 'ISO8601_UTC' | 'Unix_ms' | 'Elapsed_ms' | 'Custom';
  delimiter: string;
  max_file_size_mb: number;
  max_files: number;
  buffer_rows: number;
}

export type ConditionType =
  | 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq'
  | 'in_range' | 'out_of_range' | 'rate_of_change' | 'stale_data' | 'deviation';

export type Severity = 'info' | 'warning' | 'critical';
export type AlarmActionType = 'visual' | 'log' | 'popup' | 'set_variable' | 'sound';

export interface AlarmAction {
  type: AlarmActionType;
  target_widget?: string;
  flash_color?: string;
  flash_duration_ms?: number;
  log_level?: 'debug' | 'info' | 'warning' | 'error';
  log_message?: string;
  popup_title?: string;
  popup_message?: string;
  target_variable?: string;
  target_value?: unknown;
  frequency?: number;
  duration_ms?: number;
}

export interface AlarmCondition {
  type: ConditionType;
  threshold?: number;
  value?: unknown;
  min?: number;
  max?: number;
  max_rate?: number;
  window_s?: number;
  timeout_s?: number;
  reference_var?: string;
  max_deviation?: number;
}

export interface HysteresisConfig {
  enabled: boolean;
  reset_threshold: number;
}

export interface AlarmIR {
  id: string;
  name: string;
  enabled: boolean;
  source_variable: string;
  condition: AlarmCondition;
  hysteresis: HysteresisConfig;
  severity: Severity;
  actions: AlarmAction[];
  check_interval_ms: number;
  cooldown_ms: number;
  description?: string;
}

export interface ProjectIR {
  metadata: {
    name: string;
    version: string;
    created_at: string;
    modified_at: string;
    author?: string;
    description?: string;
  };
  version: string;
  window: {
    title: string;
    width: number;
    height: number;
    resizable_w: boolean;
    resizable_h: boolean;
    bg_color?: string;
    icon_path?: string;
  };
  canvas_state: {
    zoom: number;
    pan_x: number;
    pan_y: number;
    snap_enabled: boolean;
    snap_size: number;
    show_grid: boolean;
  };
  widgets: WidgetIR[];
  state_variables: StateVariableIR[];
  instruments: InstrumentIR[];
  data_loggers: DataLoggerIR[];
  alarms: AlarmIR[];
}
```

---

### 4.2 Complete JSON Example

A complete `.gui.json` file for a "Multimeter Readout" project:

```json
{
  "metadata": {
    "name": "Multimeter Readout",
    "version": "1.0",
    "created_at": "2026-05-07T10:30:00Z",
    "modified_at": "2026-05-07T14:22:00Z",
    "description": "Keysight 34401A multimeter voltage readout"
  },
  "version": "1.0",
  "window": {
    "title": "Multimeter Readout",
    "width": 500,
    "height": 350,
    "resizable_w": false,
    "resizable_h": false,
    "bg_color": "#1e1e2e"
  },
  "canvas_state": {
    "zoom": 1.0,
    "pan_x": 0,
    "pan_y": 0,
    "snap_enabled": true,
    "snap_size": 8,
    "show_grid": true
  },
  "widgets": [
    {
      "id": "lbl_title_a1b2c3",
      "type": "Label",
      "name": "lbl_title",
      "x": 20,
      "y": 20,
      "width": 300,
      "height": 40,
      "visible": true,
      "locked": false,
      "z_index": 0,
      "properties": { "text": "Voltage Monitor", "anchor": "w", "justify": "left" },
      "style": { "fg": "#cdd6f4", "font_family": "Segoe UI", "font_size": 20, "font_weight": "bold" }
    },
    {
      "id": "lbl_voltage_d4e5f6",
      "type": "Label",
      "name": "lbl_voltage_display",
      "x": 180,
      "y": 80,
      "width": 200,
      "height": 50,
      "visible": true,
      "locked": false,
      "z_index": 1,
      "properties": { "text": "0.0000 V", "anchor": "center", "justify": "center" },
      "style": { "bg": "#313244", "fg": "#89dceb", "font_family": "Consolas", "font_size": 28, "font_weight": "bold", "border_width": 2, "border_color": "#45475a" },
      "binding": { "variable": "voltage", "transform": "f\"{value:.4f} V\"" }
    },
    {
      "id": "btn_read_g7h8i9",
      "type": "Button",
      "name": "btn_read",
      "x": 50,
      "y": 160,
      "width": 120,
      "height": 40,
      "visible": true,
      "locked": false,
      "z_index": 2,
      "properties": { "text": "Read", "relief": "flat" },
      "style": { "bg": "#89b4fa", "fg": "#1e1e2e", "font_family": "Segoe UI", "font_size": 12, "font_weight": "bold" },
      "command": "on_btn_read_click"
    },
    {
      "id": "btn_stop_j0k1l2",
      "type": "Button",
      "name": "btn_stop",
      "x": 190,
      "y": 160,
      "width": 120,
      "height": 40,
      "visible": true,
      "locked": false,
      "z_index": 3,
      "properties": { "text": "Stop", "relief": "flat" },
      "style": { "bg": "#f38ba8", "fg": "#1e1e2e", "font_family": "Segoe UI", "font_size": 12, "font_weight": "bold" },
      "command": "on_btn_stop_click"
    },
    {
      "id": "chk_continuous_m3n4o5",
      "type": "Checkbutton",
      "name": "chk_continuous",
      "x": 50,
      "y": 220,
      "width": 160,
      "height": 28,
      "visible": true,
      "locked": false,
      "z_index": 4,
      "properties": { "text": "Continuous Mode", "variable": "is_running" },
      "style": { "fg": "#cdd6f4", "font_family": "Segoe UI", "font_size": 11 }
    },
    {
      "id": "txt_log_p6q7r8",
      "type": "Text",
      "name": "txt_log",
      "x": 330,
      "y": 20,
      "width": 320,
      "height": 200,
      "visible": true,
      "locked": false,
      "z_index": 5,
      "properties": { "wrap": "word", "height": 10, "width": 40, "state": "disabled" },
      "style": { "bg": "#181825", "fg": "#cdd6f4", "font_family": "Consolas", "font_size": 10 }
    },
    {
      "id": "frm_settings_s9t0u1",
      "type": "LabelFrame",
      "name": "frm_settings",
      "x": 20,
      "y": 260,
      "width": 460,
      "height": 120,
      "visible": true,
      "locked": false,
      "z_index": 6,
      "properties": { "text": "Instrument Settings", "labelanchor": "nw" },
      "style": { "bg": "#313244", "fg": "#cdd6f4", "font_family": "Segoe UI", "font_size": 10, "font_weight": "bold", "relief": "groove", "border_width": 2 }
    }
  ],
  "state_variables": [
    { "name": "voltage", "var_type": "float", "default_value": 0.0, "format": "%.4f V", "min": -1000.0, "max": 1000.0, "description": "Measured voltage from DMM" },
    { "name": "is_running", "var_type": "bool", "default_value": false, "description": "Continuous reading mode flag" }
  ],
  "instruments": [
    {
      "name": "DMM_34401A",
      "protocol": "visa",
      "enabled": true,
      "resource_string": "GPIB0::22::INSTR",
      "backend": "pyvisa-py",
      "timeout_ms": 5000,
      "read_termination": "\n",
      "write_termination": "\n",
      "commands": [
        { "name": "read_voltage", "display_name": "Read DC Voltage", "send": "MEAS:VOLT:DC?\n", "parse_type": "float", "parse_expression": "float(response.strip())", "unit": "V", "display_format": "%.6f", "timeout_ms": 5000 },
        { "name": "read_idn", "display_name": "Identify", "send": "*IDN?\n", "parse_type": "string", "parse_expression": "response.strip()" }
      ],
      "polling": { "enabled": true, "interval_ms": 500, "commands": ["read_voltage"], "on_error": "continue" }
    }
  ],
  "data_loggers": [
    {
      "id": "logger_voltage",
      "name": "voltage_logger",
      "enabled": true,
      "sources": [{ "variable": "voltage", "column_name": "Voltage_V", "format": "%.6f" }],
      "format": "csv",
      "file_path": "./logs/voltage_{date}.csv",
      "interval_ms": 1000,
      "include_timestamp": true,
      "timestamp_format": "ISO8601",
      "delimiter": ",",
      "max_file_size_mb": 10,
      "max_files": 7,
      "buffer_rows": 50
    }
  ],
  "alarms": [
    {
      "id": "alarm_overvoltage",
      "name": "overvoltage_alarm",
      "enabled": true,
      "source_variable": "voltage",
      "condition": { "type": "gt", "threshold": 250.0 },
      "hysteresis": { "enabled": true, "reset_threshold": 240.0 },
      "severity": "critical",
      "actions": [
        { "type": "visual", "target_widget": "lbl_voltage_display", "flash_color": "#f38ba8", "flash_duration_ms": 500 },
        { "type": "log", "log_level": "warning", "log_message": "ALARM: Voltage {value}V exceeds threshold {threshold}V" }
      ],
      "check_interval_ms": 500,
      "cooldown_ms": 5000
    }
  ]
}
```

---

### 4.3 Tkinter Code Generator Design

#### 4.3.1 Generator Architecture

The `TkinterGenerator` implements the **Visitor Pattern** to traverse the IR tree and emit clean, PEP8-compliant Python code. Code is accumulated as `List[str]` and joined at the end.

```python
class CodeBuilder:
    INDENT = "    "  # 4 spaces (PEP8)

    def __init__(self):
        self.lines: list[str] = []
        self._indent_level = 0

    def add(self, line: str = ""):
        if line == "":
            self.lines.append("")
        else:
            self.lines.append(self.INDENT * self._indent_level + line)

    def indent(self): self._indent_level += 1
    def dedent(self): self._indent_level = max(0, self._indent_level - 1)
    def __str__(self) -> str:
        return "\n".join(self.lines)
```

#### 4.3.2 Visitor Dispatch Pattern

```python
class TkinterGenerator:
    """Generates Python tkinter code from IR."""

    def __init__(self):
        self.code = CodeBuilder()
        self.imports: set[str] = set()
        self._instrument_methods: list[str] = []

    def visit_project(self, project: ProjectIR) -> str:
        self.code = CodeBuilder()
        self.imports = {"tkinter as tk", "tkinter.ttk as ttk"}
        self._emit_header(project)
        self._emit_class_def(project)
        return str(self.code)

    def _emit_class_def(self, project: ProjectIR) -> None:
        class_name = self._to_class_name(project.metadata.name)
        self.code.add(f"class {class_name}:")
        self.code.indent()
        self._emit_init(project)
        self._emit_event_handlers(project)
        self._emit_instrument_methods(project)
        self._emit_cleanup(project)
        self.code.dedent()
        self._emit_main_block(class_name)

    def visit_widget(self, widget: WidgetIR, parent_var: str = "self.root") -> None:
        method_name = f"visit_{widget.type}"
        visitor = getattr(self, method_name, self.visit_generic)
        visitor(widget, parent_var)

    def _emit_place_layout(self, node: dict, name: str) -> None:
        x, y = node.get("x", 0), node.get("y", 0)
        w, h = node.get("width", 80), node.get("height", 24)
        self.code.add(f"self.{name}.place(x={x}, y={y}, width={w}, height={h})")

    def _emit_grid_layout(self, node: dict, name: str, grid_config: dict) -> None:
        row, col = grid_config.get("row", 0), grid_config.get("col", 0)
        sticky = grid_config.get("sticky", "")
        padx, pady = grid_config.get("padx", 0), grid_config.get("pady", 0)
        kwargs = f"row={row}, column={col}"
        if sticky: kwargs += f', sticky="{sticky}"'
        if padx: kwargs += f", padx={padx}"
        if pady: kwargs += f", pady={pady}"
        self.code.add(f"self.{name}.grid({kwargs})")
```

#### 4.3.3 Widget Type Map

| Widget Type | tkinter Class | Layout Method | Key Properties |
|-------------|---------------|---------------|----------------|
| Label | `tk.Label` | `place()` | text, textvariable, anchor, wraplength, justify |
| Button | `tk.Button` | `place()` | text, command, relief, default, image, compound |
| Entry | `tk.Entry` | `place()` | textvariable, show, width, justify, validate |
| Text | `tk.Text` | `place()` | width, height, wrap, yscrollcommand, state |
| Frame | `tk.Frame` | `place()` | relief, borderwidth, padx, pady |
| LabelFrame | `tk.LabelFrame` | `place()` | text, labelanchor, relief, borderwidth |
| Notebook | `ttk.Notebook` | `place()` | tabs (list), width, height, padding |
| PanedWindow | `tk.PanedWindow` | `place()` | orient, sashwidth, sashrelief |
| GridContainer | `tk.LabelFrame` (wrapper) | `place()` self + `grid()` children | rows, columns, row_padding, col_padding |
| Listbox | `tk.Listbox` | `place()` | height, width, selectmode, listvariable, values |
| Scale | `tk.Scale` | `place()` | from_, to, resolution, orient, variable, command |
| Checkbutton | `tk.Checkbutton` | `place()` | text, variable, onvalue, offvalue, indicatoron |
| Radiobutton | `tk.Radiobutton` | `place()` | text, variable, value, indicatoron |
| Combobox | `ttk.Combobox` | `place()` | values, textvariable, width, state |
| Spinbox | `tk.Spinbox` | `place()` | from_, to, increment, values, textvariable |
| Progressbar | `ttk.Progressbar` | `place()` | orient, mode, maximum, variable |
| Canvas | `tk.Canvas` | `place()` | width, height, scrollregion, bg |
| Separator | `ttk.Separator` | `place()` | orient |
| InstrumentReadout | Composite (Label + Frame) | `place()` | decimal_places, unit_suffix, instrument_binding |
| SerialMonitor | Composite (Text + Entry + Button) | `place()` | baud, port, line_ending |
| PlotCanvas | Composite (matplotlib) | `place()` | x_label, y_label, title, num_points |
| DataLogger | Composite (Labels + Buttons) | `place()` | log_format, interval, sources |
| AlarmIndicator | Composite (Frame + Label) | `place()` | condition_expr, severity, target_widget |

---

### 4.4 Grid Container Code Generation

A GridContainer is rendered as a wrapper frame using tkinter `grid()` for child widget layout.

**Wrapper generation:**
```python
def visit_GridContainer(self, node, parent_var="self.root"):
    name = node["name"]
    p = node.get("properties", {})
    style = node.get("style", {})

    self.code.add(f"# {name}: Grid Container")
    self.code.add(f"self.{name} = tk.Frame({parent_var}, relief=tk.SUNKEN, bd=1)")
    self.code.add(f"self.{name}.place(")
    self.code.indent()
    self.code.add(f"x={node['x']}, y={node['y']},")
    self.code.add(f"width={node['width']}, height={node['height']}")
    self.code.dedent()
    self.code.add(")")
    self.code.add("")

    rows = p.get("rows", 2)
    cols = p.get("cols", 2)
    for r in range(rows):
        weight = p.get(f"row_weight_{r}", 0)
        if weight > 0:
            self.code.add(f"self.{name}.rowconfigure({r}, weight={weight})")
    for c in range(cols):
        weight = p.get(f"col_weight_{c}", 0)
        if weight > 0:
            self.code.add(f"self.{name}.columnconfigure({c}, weight={weight})")
    self.code.add("")

    for child_id in node.get("children", []):
        child = self._lookup_widget(child_id)
        child_name = child["name"]
        child_props = child.get("layout_props", {})
        row = child_props.get("row", 0)
        col = child_props.get("col", 0)
        rowspan = child_props.get("rowspan", 1)
        colspan = child_props.get("colspan", 1)
        sticky = child_props.get("sticky", "")
        padx = child_props.get("padx", 0)
        pady = child_props.get("pady", 0)

        self.code.add(f"self.{child_name}.grid(")
        self.code.indent()
        self.code.add(f"row={row}, column={col},")
        if rowspan > 1:
            self.code.add(f"rowspan={rowspan},")
        if colspan > 1:
            self.code.add(f"columnspan={colspan},")
        if sticky:
            self.code.add(f'sticky="{sticky}",')
        if padx or pady:
            self.code.add(f"padx=({padx}, {padx}), pady=({pady}, {pady})")
        self.code.dedent()
        self.code.add(")")
    self.code.add("")
```

**Row/column weight map:**

| Property | IR Field | tkinter API | Default |
|----------|----------|-------------|---------|
| Row weight | `row_weight_N` | `frame.rowconfigure(N, weight=val)` | 0 (fixed) |
| Column weight | `col_weight_N` | `frame.columnconfigure(N, weight=val)` | 0 (fixed) |
| Row minsize | `row_minsize_N` | `frame.rowconfigure(N, minsize=val)` | 0 |
| Column minsize | `col_minsize_N` | `frame.columnconfigure(N, minsize=val)` | 0 |
| Uniform group | `uniform` | `frame.columnconfigure(N, uniform=group)` | None |
| Padding | `padx`, `pady` | `grid(padx=val, pady=val)` | 0 |
| Sticky | `sticky` | `grid(sticky="NSEW")` | "" |
| Rowspan | `rowspan` | `grid(rowspan=val)` | 1 |
| Columnspan | `colspan` | `grid(columnspan=val)` | 1 |

---

### 4.5 State Variable Code Generation

Each state variable becomes a `tk.StringVar`, `tk.IntVar`, `tk.DoubleVar`, or `tk.BooleanVar`:

```python
def _init_state_variables(self):
    """Initialize tkinter variable bindings."""
    for sv in self.project["state_variables"]:
        name = sv["name"]
        var_type = sv["var_type"]
        default = sv["default_value"]
        var_class = {
            "string": "tk.StringVar",
            "int": "tk.IntVar",
            "float": "tk.DoubleVar",
            "bool": "tk.BooleanVar",
        }[var_type]
        if var_type == "string":
            self.code.add(f'self.var_{name} = {var_class}(value="{default}")')
        else:
            self.code.add(f'self.var_{name} = {var_class}(value={default})')

        fmt = sv.get("format")
        if fmt:
            self.code.add(f"self.var_{name}.trace_add(\"write\", self._fmt_{name})")
```

**Variable type mapping:**

| IR Type | tkinter Class | Python Type | Example Default |
|---------|---------------|-------------|-----------------|
| `string` | `tk.StringVar` | `str` | `""` |
| `int` | `tk.IntVar` | `int` | `0` |
| `float` | `tk.DoubleVar` | `float` | `0.0` |
| `bool` | `tk.BooleanVar` | `bool` | `False` |

---

### 4.6 Instrument Code Generation (VISA + Serial)

#### 4.6.1 VISA Instrument

```python
def _init_instruments(self):
    """Initialize instrument connections."""
    import_needed = False
    for inst in self.project["instruments"]:
        name = inst["name"]
        if inst["protocol"] == "visa":
            import_needed = True
            self.code.add(f"self.rm_{name} = pyvisa.ResourceManager()")
            self.code.add(f"self.instr_{name} = self.rm_{name}.open_resource(")
            self.code.indent()
            self.code.add(f'"{inst["resource_string"]}"')
            self.code.dedent()
            self.code.add(")")
            timeout = inst.get("timeout_ms", 5000)
            self.code.add(f"self.instr_{name}.timeout = {timeout}")
            rterm = inst.get("read_termination")
            if rterm:
                self.code.add(f'self.instr_{name}.read_termination = "{rterm}"')
            wterm = inst.get("write_termination")
            if wterm:
                self.code.add(f'self.instr_{name}.write_termination = "{wterm}"')
        elif inst["protocol"] == "serial":
            import_needed = True
            self.code.add(f"self.instr_{name} = serial.Serial(")
            self.code.indent()
            self.code.add(f'port="{inst["port"]}",')
            self.code.add(f'baudrate={inst["baudrate"]},')
            self.code.add(f'bytesize={inst.get("bytesize", 8)},')
            self.code.add(f'parity="{inst.get("parity", "N")}",')
            self.code.add(f'stopbits={inst.get("stopbits", 1)},')
            self.code.add(f'timeout={inst.get("timeout", 1)}')
            self.code.dedent()
            self.code.add(")")
    if import_needed:
        self.imports.add("pyvisa")
        self.imports.add("serial")
```

#### 4.6.2 Command Method Generation

Each instrument command becomes a dedicated Python method:

```python
def _emit_instrument_methods(self):
    for inst in self.project["instruments"]:
        inst_name = inst["name"]
        for cmd in inst["commands"]:
            cmd_name = cmd["name"]
            method_name = f"_instr_{inst_name}_{cmd_name}"
            display_name = cmd.get("display_name", cmd_name)
            self.code.add("")
            self.code.add(f"    def {method_name}(self):")
            self.code.add(f'        """{display_name}."""')
            self.code.add("        try:")
            self.code.add(f'            self.instr_{inst_name}.write("{cmd["send"]}")')
            self.code.add(f"            response = self.instr_{inst_name}.read()")
            parse_expr = cmd.get("parse_expression", "response.strip()")
            self.code.add(f"            value = {parse_expr}")
            transform = cmd.get("transform")
            if transform:
                self.code.add(f"            value = {transform}")
            var_binding = cmd.get("bind_variable")
            if var_binding:
                self.code.add(f"            self.var_{var_binding}.set(value)")
            self.code.add("        except Exception as e:")
            self.code.add(f'            print(f"Instrument error ({cmd_name}): {{e}}")')
```

**Parse type map:**

| Parse Type | Generated Code |
|------------|----------------|
| `float` | `float(response.strip())` |
| `int` | `int(response.strip())` |
| `string` | `response.strip()` |
| `regex` | `re.search(pattern, response).group(1)` |
| `bytes` | `response` (raw bytes) |
| `json` | `json.loads(response)` |
| `none` | No parsing; return raw response |

#### 4.6.3 Polling Thread Generation

```python
def _emit_polling_threads(self):
    for inst in self.project["instruments"]:
        polling = inst.get("polling", {})
        if not polling.get("enabled", False):
            continue
        inst_name = inst["name"]
        interval = polling.get("interval_ms", 500) / 1000.0
        commands = polling.get("commands", [])
        on_error = polling.get("on_error", "continue")
        self.code.add(f"    def _poll_{inst_name}(self):")
        self.code.add(f'        """Polling thread for {inst_name}."""')
        self.code.add(f"        self._polling_{inst_name} = True")
        self.code.add("        while self._polling_{inst_name}:")
        self.code.indent()
        self.code.add("            try:")
        for cmd_name in commands:
            self.code.add(f"                self._instr_{inst_name}_{cmd_name}()")
        self.code.add(f"                time.sleep({interval})")
        self.code.add("            except Exception as e:")
        if on_error == "stop":
            self.code.add(f'                print(f"Polling stopped: {{e}}")')
            self.code.add("                break")
        elif on_error == "retry_3x":
            self.code.add("                retries += 1")
            self.code.add("                if retries >= 3: break")
            self.code.add("                time.sleep(1)")
        else:
            self.code.add(f'                print(f"Poll error: {{e}}")')
        self.code.dedent()
        self.code.add("")
        self.code.add(f"        self._poll_thread_{inst_name} = threading.Thread(")
        self.code.add(f'            target=self._poll_{inst_name}, daemon=True')
        self.code.add("        )")
        self.code.add(f"        self._poll_thread_{inst_name}.start()")
```

---

### 4.7 Data Logger Code Generation

```python
def _emit_data_loggers(self):
    for dl in self.project.get("data_loggers", []):
        if not dl.get("enabled", True):
            continue
        name = dl["name"]
        interval = dl["interval_ms"] / 1000.0
        fmt = dl.get("format", "csv")
        filepath = dl.get("file_path", "./log.csv")
        max_size_mb = dl.get("max_file_size_mb", 0)
        buffer_rows = dl.get("buffer_rows", 1)
        include_ts = dl.get("include_timestamp", True)
        self.code.add(f"    def _logger_{name}(self):")
        self.code.add(f'        """Data logger thread for {name}."""')
        if buffer_rows > 1:
            self.code.add("        buffer = []")
        self.code.add(f"        self._logging_{name} = True")
        self.code.add(f"        while self._logging_{name}:")
        self.code.indent()
        self.code.add("            try:")
        if fmt == "csv":
            self.code.add(f'                with open("{filepath}", "a", newline="") as f:')
            self.code.add("                    writer = csv.writer(f)")
            self.code.add("                    if f.tell() == 0:")
            columns = [s.get("column_name", s["variable"]) for s in dl["sources"]]
            headers = (["timestamp"] if include_ts else []) + columns
            self.code.add(f"                        writer.writerow({headers})")
        self.code.add("                    row = []")
        if include_ts:
            self.code.add("                        row.append(datetime.now().isoformat())")
        for src in dl["sources"]:
            var_name = src["variable"]
            self.code.add(f"                    row.append(self.var_{var_name}.get())")
        if fmt == "csv":
            self.code.add("                    writer.writerow(row)")
        self.code.add("                    f.flush()")
        if max_size_mb > 0:
            self.code.add(f"                if os.path.getsize('{filepath}') > {max_size_mb * 1024 * 1024}:")
            self.code.add("                    _rotate_file()")
        self.code.add("            except Exception as e:")
        self.code.add(f'                print(f"Logger error: {{e}}")')
        self.code.add(f"            time.sleep({interval})")
        self.code.dedent()
```

---

### 4.8 Alarm Code Generation

```python
def _emit_alarms(self):
    for alarm in self.project.get("alarms", []):
        if not alarm.get("enabled", True):
            continue
        name = alarm["name"]
        src_var = alarm["source_variable"]
        interval = alarm["check_interval_ms"] / 1000.0
        cooldown = alarm["cooldown_ms"] / 1000.0
        condition = alarm["condition"]
        hysteresis = alarm.get("hysteresis", {})
        self.code.add(f"    def _alarm_{name}(self):")
        self.code.add(f'        """Alarm monitor: {name}."""')
        self.code.add(f"        last_trigger = 0")
        self.code.add(f"        is_active = False")
        self.code.add(f"        self._alarm_running = True")
        self.code.add(f"        while self._alarm_running:")
        self.code.indent()
        self.code.add("            try:")
        self.code.add(f"                value = self.var_{src_var}.get()")
        self.code.add("                now = time.time()")
        cond_type = condition["type"]
        threshold = condition.get("threshold")
        cond_code = {
            "gt": f"value > {threshold}", "lt": f"value < {threshold}",
            "gte": f"value >= {threshold}", "lte": f"value <= {threshold}",
            "eq": f"value == {condition.get('value')}",
            "neq": f"value != {condition.get('value')}",
            "in_range": f"{condition.get('min', 0)} <= value <= {condition.get('max', 0)}",
            "out_of_range": f"value < {condition.get('min', 0)} or value > {condition.get('max', 0)}",
        }.get(cond_type, "False")
        self.code.add(f"                triggered = {cond_code}")
        if hysteresis.get("enabled", False):
            reset_thresh = hysteresis["reset_threshold"]
            reset_code = {"gt": f"value <= {reset_thresh}", "lt": f"value >= {reset_thresh}"}.get(cond_type, f"value <= {reset_thresh}")
            self.code.add("                if is_active and not triggered:")
            self.code.add(f"                    triggered = {reset_code}")
        self.code.add("                if triggered:")
        self.code.add(f"                    if not is_active and (now - last_trigger) > {cooldown}:")
        self.code.add("                        is_active = True")
        self.code.add("                        last_trigger = now")
        for action in alarm.get("actions", []):
            action_type = action["type"]
            if action_type == "visual":
                target = action.get("target_widget", "")
                color = action.get("flash_color", "#ff0000")
                duration = action.get("flash_duration_ms", 500)
                self.code.add(f"                        self._flash_widget('{target}', '{color}', {duration})")
            elif action_type == "log":
                msg = action.get("log_message", "Alarm triggered")
                self.code.add(f"                        print('{msg}')")
            elif action_type == "popup":
                title = action.get("popup_title", "Alarm")
                msg = action.get("popup_message", "Alarm triggered")
                self.code.add(f"                        import tkinter.messagebox")
                self.code.add(f'                        tkinter.messagebox.showwarning("{title}", "{msg}")')
            elif action_type == "set_variable":
                target_var = action.get("target_variable", "")
                target_val = action.get("target_value")
                self.code.add(f"                        self.var_{target_var}.set({target_val})")
        self.code.add("                elif not triggered and is_active:")
        self.code.add("                    is_active = False")
        self.code.add("            except Exception as e:")
        self.code.add(f'                print(f"Alarm error: {{e}}")')
        self.code.add(f"            time.sleep({interval})")
        self.code.dedent()
        self.code.add(f"        self._alarm_thread_{name} = threading.Thread(")
        self.code.add(f'            target=self._alarm_{name}, daemon=True')
        self.code.add("        )")
        self.code.add(f"        self._alarm_thread_{name}.start()")
```

**Alarm condition map:**

| Condition Type | Generated Python Expression |
|----------------|----------------------------|
| `gt` | `value > threshold` |
| `lt` | `value < threshold` |
| `gte` | `value >= threshold` |
| `lte` | `value <= threshold` |
| `eq` | `value == value` |
| `neq` | `value != value` |
| `in_range` | `min <= value <= max` |
| `out_of_range` | `value < min or value > max` |
| `rate_of_change` | `(value - prev_value) / dt > max_rate` |
| `stale_data` | `(now - last_update) > timeout_s` |
| `deviation` | `abs(value - ref_value) > max_deviation` |

---

### 4.9 Cleanup Code Generation

```python
def _emit_cleanup(self):
    self.code.add("")
    self.code.add("    def on_closing(self):")
    self.code.add('        """Clean up resources before exit."""')
    for inst in self.project.get("instruments", []):
        inst_name = inst["name"]
        self.code.add(f"        self._polling_{inst_name} = False")
        self.code.add(f"        if hasattr(self, '_poll_thread_{inst_name}'):")
        self.code.add(f"            self._poll_thread_{inst_name}.join(timeout=2.0)")
    for dl in self.project.get("data_loggers", []):
        name = dl["name"]
        self.code.add(f"        self._logging_{name} = False")
        self.code.add(f"        if hasattr(self, '_log_thread_{name}'):")
        self.code.add(f"            self._log_thread_{name}.join(timeout=2.0)")
    self.code.add("        self._alarm_running = False")
    for alarm in self.project.get("alarms", []):
        name = alarm["name"]
        self.code.add(f"        if hasattr(self, '_alarm_thread_{name}'):")
        self.code.add(f"            self._alarm_thread_{name}.join(timeout=1.0)")
    for inst in self.project.get("instruments", []):
        inst_name = inst["name"]
        if inst["protocol"] == "visa":
            self.code.add(f"        if hasattr(self, 'instr_{inst_name}'):")
            self.code.add(f"            self.instr_{inst_name}.close()")
            self.code.add(f"        if hasattr(self, 'rm_{inst_name}'):")
            self.code.add(f"            self.rm_{inst_name}.close()")
        elif inst["protocol"] == "serial":
            self.code.add(f"        if hasattr(self, 'instr_{inst_name}') and self.instr_{inst_name}.is_open:")
            self.code.add(f"            self.instr_{inst_name}.close()")
    self.code.add("        self.root.destroy()")
```

---

### 4.10 Schema Validation & Migration

#### 4.10.1 Zod Validation Schema

```typescript
// src/ir/schema.ts
import { z } from 'zod';

export const WidgetTypeSchema = z.enum([
  'Label', 'Button', 'Entry', 'Text', 'Frame', 'Canvas',
  'Listbox', 'Scale', 'Checkbutton', 'Radiobutton', 'Combobox',
  'Spinbox', 'Progressbar', 'Separator', 'LabelFrame', 'Notebook',
  'PanedWindow', 'GridContainer',
  'InstrumentReadout', 'SerialMonitor', 'PlotCanvas',
  'DataLogger', 'AlarmIndicator',
]);

export const VarTypeSchema = z.enum(['string', 'int', 'float', 'bool']);
export const ProtocolSchema = z.enum(['visa', 'serial', 'tcp', 'mock']);

export const WidgetStyleSchema = z.object({
  bg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  fg: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  font_family: z.string().optional(),
  font_size: z.number().int().min(1).max(200).optional(),
  font_weight: z.enum(['normal', 'bold']).optional(),
  font_slant: z.enum(['roman', 'italic']).optional(),
  relief: z.enum(['flat', 'raised', 'sunken', 'groove', 'ridge', 'solid']).optional(),
  border_width: z.number().int().min(0).optional(),
  cursor: z.string().optional(),
});

export const WidgetIRSchema = z.object({
  id: z.string().min(1),
  type: WidgetTypeSchema,
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  x: z.number().int(),
  y: z.number().int(),
  width: z.number().int().min(1),
  height: z.number().int().min(1),
  visible: z.boolean(),
  locked: z.boolean(),
  parent_id: z.string().nullable().optional(),
  z_index: z.number().int().min(0),
  properties: z.record(z.unknown()),
  style: WidgetStyleSchema,
  command: z.string().optional(),
  tooltip: z.string().optional(),
});

export const StateVariableIRSchema = z.object({
  name: z.string().regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/),
  var_type: VarTypeSchema,
  default_value: z.unknown(),
  format: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  description: z.string().optional(),
});

export const CommandIRSchema = z.object({
  name: z.string(),
  display_name: z.string().optional(),
  send: z.string(),
  parse_type: z.enum(['float', 'int', 'string', 'regex', 'bytes', 'json', 'none']),
  parse_expression: z.string().optional(),
  transform: z.string().optional(),
  unit: z.string().optional(),
  display_format: z.string().optional(),
  timeout_ms: z.number().int().optional(),
});

export const InstrumentIRSchema = z.object({
  name: z.string(),
  protocol: ProtocolSchema,
  enabled: z.boolean(),
  resource_string: z.string().optional(),
  backend: z.string().optional(),
  timeout_ms: z.number().int().optional(),
  read_termination: z.string().optional(),
  write_termination: z.string().optional(),
  port: z.string().optional(),
  baudrate: z.number().int().optional(),
  commands: z.array(CommandIRSchema),
});

export const DataLoggerIRSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  sources: z.array(z.object({
    variable: z.string(),
    column_name: z.string().optional(),
    format: z.string().optional(),
  })),
  format: z.enum(['csv', 'json']),
  file_path: z.string(),
  interval_ms: z.number().int().min(1),
  max_file_size_mb: z.number().int().min(0),
  max_files: z.number().int().min(0),
  buffer_rows: z.number().int().min(1),
});

export const ProjectIRSchema = z.object({
  metadata: z.object({
    name: z.string(),
    version: z.string(),
    created_at: z.string(),
    modified_at: z.string(),
    author: z.string().optional(),
    description: z.string().optional(),
  }),
  version: z.string(),
  window: z.object({
    title: z.string(),
    width: z.number().int(),
    height: z.number().int(),
    resizable_w: z.boolean(),
    resizable_h: z.boolean(),
    bg_color: z.string().optional(),
  }),
  widgets: z.array(WidgetIRSchema),
  state_variables: z.array(StateVariableIRSchema),
  instruments: z.array(InstrumentIRSchema),
  data_loggers: z.array(DataLoggerIRSchema),
  alarms: z.array(z.any()),
});
```

#### 4.10.2 Version Migration

```typescript
// src/ir/migrate.ts
type MigrationFn = (data: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<string, MigrationFn> = {
  '0.9': (data) => {
    data.version = '1.0';
    if (!data.canvas_state) {
      data.canvas_state = {
        zoom: 1.0, pan_x: 0, pan_y: 0,
        snap_enabled: true, snap_size: 8, show_grid: true,
      };
    }
    if (!data.alarms) data.alarms = [];
    return data;
  },
};

export function migrateIR(data: Record<string, unknown>): ProjectIR {
  const version = (data.version as string) || '0.9';
  let current = { ...data };
  for (const [v, fn] of Object.entries(MIGRATIONS)) {
    if (version < v) current = fn(current);
  }
  return ProjectIRSchema.parse(current);
}
```

---

### 4.11 Widget Property Defaults Table

Default values for each widget type when created from the palette:

| Widget Type | Default W | Default H | Default Text | Key Default Properties |
|---|---|---|---|---|
| Label | 80 | 20 | "Label" | anchor="center", justify="left" |
| Button | 80 | 24 | "Button" | relief="raised" |
| Entry | 120 | 24 | "" | width=20, justify="left" |
| Text | 200 | 100 | "" | wrap="word", height=10 |
| Frame | 100 | 80 | "" | relief="flat", borderwidth=0 |
| LabelFrame | 150 | 100 | "Frame" | labelanchor="nw", relief="groove" |
| Notebook | 300 | 200 | "" | padding=2 |
| PanedWindow | 300 | 200 | "" | orient="horizontal" |
| GridContainer | 300 | 200 | "" | rows=2, cols=2 |
| Listbox | 120 | 80 | "" | height=5, selectmode="single" |
| Scale | 120 / 24 | 24 / 120 | "" | from_=0, to=100, resolution=1 |
| Checkbutton | 120 | 24 | "Check" | onvalue=1, offvalue=0 |
| Radiobutton | 120 | 24 | "Option" | value=0 |
| Combobox | 120 | 24 | "" | values=[], state="readonly" |
| Spinbox | 80 | 24 | "" | from_=0, to=100, increment=1 |
| Progressbar | 150 | 20 | "" | mode="determinate", maximum=100 |
| Canvas | 200 | 150 | "" | scrollregion="0 0 200 150" |
| Separator | 100 / 2 | 2 / 100 | "" | orient="horizontal" |
| InstrumentReadout | 160 | 60 | "---" | decimal_places=4, unit_suffix="V" |
| SerialMonitor | 400 | 200 | "" | baud=9600, port="COM1" |
| PlotCanvas | 400 | 300 | "" | x_label="Time", y_label="Value" |
| DataLogger | 300 | 100 | "" | format="csv", interval=1000 |
| AlarmIndicator | 120 | 40 | "OK" | severity="info", flash_interval=500 |


---

## 5. Lab Domain Architecture

### 5.1 Instrument Binding System

The Instrument Binding System manages communication between the generated GUI and physical laboratory instruments via VISA, Serial, and Mock protocols. Each instrument is defined in the IR, which the code generator uses to produce instrument initialization, command methods, and polling threads.

#### 5.1.1 Supported Protocols

| Protocol | Python Library | Transport | Coverage |
|----------|---------------|-----------|----------|
| VISA | pyvisa-py (pure Python) | GPIB, USB, TCPIP, Serial | ~60% of lab instruments |
| Serial | pyserial | RS-232, RS-485 | ~20% of lab instruments |
| TCP | socket (built-in) | Ethernet | Future (Phase 2) |
| Mock | threading + random | None (simulation) | Testing without hardware |

**VISA coverage**: pyvisa-py is pure Python with no NI driver dependency, making deployment trivial (pip install pyvisa pyvisa-py). Supports GPIB (via Linux-GPIB or Prologix adapters), USBTMC, TCPIP (raw socket + HiSLIP), and serial-based VISA resources.

**Serial coverage**: pyserial supports all major platforms (Windows COM ports, Linux /dev/tty*, macOS /dev/cu.*). Auto-detection of available ports via `serial.tools.list_ports`.

#### 5.1.2 Command-Response Templates

Each instrument command is defined as a template with:

- **Send string**: Raw command bytes sent to instrument (e.g., `"MEAS:VOLT:DC?\n"`)
- **Parse type**: How to interpret the response (float, int, string, regex, bytes, json, none)
- **Parse expression**: Python expression for parsing (e.g., `"float(response.strip())"`)
- **Transform**: Optional Python expression applied after parsing (e.g., `"value * 1000"`)
- **Unit**: Display unit suffix (e.g., `"V"`, `"A"`, `"degC"`)
- **Timeout**: Per-command timeout override

**Template system**: Pre-built templates for common instruments (Keysight 34401A, Tektronix TDS1002, Keithley 2400, etc.) stored in `src/constants/instrumentTemplates.ts`. Users load a template and customize the connection string.

#### 5.1.3 Threading Model

```
Main Thread (tkinter mainloop)
    |
    +-- Instrument Connection Manager
    |       +-- VISA Resource Manager
    |       +-- Serial Port Handler
    |
    +-- Polling Thread 1 (daemon) -----> Instrument A
    |       +-- Sends command at interval
    |       +-- Parses response
    |       +-- Updates tkinter variable (via root.after())
    |
    +-- Polling Thread 2 (daemon) -----> Instrument B
    |
    +-- Data Logger Thread (daemon)
    |       +-- Reads state variables at interval
    |       +-- Writes to CSV/JSON file
    |
    +-- Alarm Monitor Thread (daemon)
    |       +-- Checks state variables against conditions
    |       +-- Triggers actions when conditions met
    |
    +-- UI Thread (tkinter mainloop)
            +-- Widget updates reflect variable changes automatically
            +-- Button callbacks run in main thread
```

**Thread safety**: All tkinter variable access from daemon threads uses `root.after(0, lambda: var.set(value))` to marshal updates onto the main thread. This is the only safe pattern for tkinter threading.

#### 5.1.4 Mock Instrument

For testing without hardware, Mock instruments generate synthetic data:

```python
def _poll_mock_DMM(self):
    """Simulate DMM readings without hardware."""
    import random
    import math
    mock_min = self._mock_DMM_min
    mock_max = self._mock_DMM_max
    interval = self._mock_DMM_interval_ms / 1000.0
    t = 0
    while self._polling_mock_DMM:
        base = (mock_min + mock_max) / 2
        amplitude = (mock_max - mock_min) / 2
        value = base + amplitude * math.sin(t * 0.1) + random.gauss(0, amplitude * 0.05)
        self.root.after(0, lambda v=value: self.var_voltage.set(v))
        t += 1
        time.sleep(interval)
```

Mock mode enables full UI development and testing without any physical instruments connected.

---

### 5.2 State Variable System

State variables provide a reactive data binding layer between instruments, UI widgets, data loggers, and alarms. They map to tkinter's built-in variable classes.

#### 5.2.1 Variable Types

| IR Type | tkinter Class | Python Type | Format String Example | Use Case |
|---------|---------------|-------------|----------------------|----------|
| `string` | `tk.StringVar` | `str` | `"{}"` | Labels, text display, status messages |
| `int` | `tk.IntVar` | `int` | `"{:d}"` | Counters, indices, discrete states |
| `float` | `tk.DoubleVar` | `float` | `"{:.4f} V"` | Sensor readings, calculations |
| `bool` | `tk.BooleanVar` | `bool` | N/A | Checkbuttons, toggle states, running flags |

#### 5.2.2 Binding Model

Widgets bind to variables via the `textvariable` or `variable` constructor argument:

```python
# Label bound to voltage variable (auto-updates when voltage changes)
self.lbl_voltage = tk.Label(self.root, textvariable=self.var_voltage)

# Checkbutton bound to boolean running flag
self.chk_continuous = tk.Checkbutton(
    self.root, text="Continuous Mode", variable=self.var_is_running
)

# Entry bound to float variable
self.entry_setpoint = tk.Entry(self.root, textvariable=self.var_setpoint)
```

#### 5.2.3 Format Strings

Format strings are applied via tkinter variable traces:

```python
# Format display: raw value -> formatted display
self.var_voltage_display = tk.StringVar(value="0.0000 V")

def _update_voltage_display(*args):
    raw = self.var_voltage.get()
    self.var_voltage_display.set(f"{raw:.4f} V")

self.var_voltage.trace_add("write", _update_voltage_display)
```

#### 5.2.4 Value Validation

Min/max validation for numeric variables:

```python
def _validate_voltage(self, *args):
    try:
        value = self.var_voltage.get()
        if value < -1000.0:
            self.var_voltage.set(-1000.0)
        elif value > 1000.0:
            self.var_voltage.set(1000.0)
    except tk.TclError:
        pass

self.var_voltage.trace_add("write", _validate_voltage)
```

#### 5.2.5 Transform Expressions

Per-binding Python expressions modify values before display:

| Transform | Input | Output | Use Case |
|-----------|-------|--------|----------|
| `value * 1000` | 0.5 V | 500 mV | Unit conversion to millivolts |
| `value + 273.15` | 25 C | 298.15 K | Temperature conversion |
| `math.log10(value)` | 1000 | 3.0 | Logarithmic display |
| `value / 10.0` | 500 mA | 50.0 A | Current conversion |
| `"ON" if value else "OFF"` | True | "ON" | Boolean to text |
| `f"{value:.2e}"` | 0.000123 | "1.23e-04" | Scientific notation |

---

### 5.3 Data Logging System

The Data Logging System records state variable values to files at regular intervals using a dedicated daemon thread.

#### 5.3.1 Log Formats

| Format | File Extension | Description | Use Case |
|--------|---------------|-------------|----------|
| CSV | `.csv` | Comma-separated values, one row per timestamp | General data logging, spreadsheet import |
| JSON | `.json` | JSON Lines format (one JSON object per line) | Structured data, programmatic analysis |

#### 5.3.2 CSV Format

```csv
timestamp,Voltage_V,Current_A,Temperature_C
2026-05-07T14:30:01.234567,5.123456,0.001234,23.5
2026-05-07T14:30:02.234567,5.123789,0.001235,23.6
```

#### 5.3.3 File Rotation

When `max_file_size_mb` is exceeded, the current file is rotated:

```
./logs/
    voltage_data.csv          # Current file
    voltage_data.csv.1        # Most recent rotated
    voltage_data.csv.2        # Older
    ...
    voltage_data.csv.7        # Oldest (deleted when 8th rotation occurs)
```

#### 5.3.4 Performance Optimizations

- **In-memory buffering**: `buffer_rows` (default 10) writes accumulated in a list and flushed to disk as a batch
- **Non-blocking I/O**: Dedicated daemon thread prevents UI freeze during file writes
- **File handle reuse**: File opened in append mode, flushed after each batch
- **Minimal overhead**: CSV writing uses Python's built-in `csv` module (C-optimized)

#### 5.3.5 Timestamp Formats

| Format | Example | Description |
|--------|---------|-------------|
| ISO8601 | `2026-05-07T14:30:01.234567` | Local time with microseconds |
| ISO8601_UTC | `2026-05-07T06:30:01.234567Z` | UTC time with Z suffix |
| Unix_ms | `1715087401234` | Milliseconds since epoch (int) |
| Elapsed_ms | `15000` | Milliseconds since logging started |
| Custom | User-defined strftime pattern | Flexible formatting |

---

### 5.4 Alarm System

The Alarm System monitors state variables against configurable conditions and executes actions when triggered.

#### 5.4.1 Condition Types

| Condition | Parameters | Description | Example |
|-----------|------------|-------------|---------|
| `gt` | `threshold` | Value > threshold | Over-voltage detection |
| `lt` | `threshold` | Value < threshold | Under-temperature |
| `gte` | `threshold` | Value >= threshold | At or above limit |
| `lte` | `threshold` | Value <= threshold | At or below limit |
| `eq` | `value` | Value == reference | Exact match |
| `neq` | `value` | Value != reference | Deviation from normal |
| `in_range` | `min`, `max` | min <= value <= max | Acceptable band |
| `out_of_range` | `min`, `max` | value < min or value > max | Outside acceptable band |
| `rate_of_change` | `max_rate`, `window_s` | abs(dv/dt) > max_rate | Rapid change detection |
| `stale_data` | `timeout_s` | No update within timeout | Communication failure |
| `deviation` | `reference_var`, `max_deviation` | abs(value - ref) > max | Drift detection |

#### 5.4.2 Hysteresis

Hysteresis prevents alarm flapping (rapid on/off toggling near a threshold):

```
    Voltage
      |
  250 +---------- Alarm triggers (value > threshold)
      |         /
      |        /
  240 +-------+   Alarm resets (value < reset_threshold)
      |      /
      |     /
      +----+------ Time
```

With hysteresis enabled:
- **Trigger**: value > threshold (250.0)
- **Reset**: value < reset_threshold (240.0)
- **Gap**: 10.0 V hysteresis band prevents re-triggering

#### 5.4.3 Alarm Actions

| Action Type | Parameters | Description |
|-------------|------------|-------------|
| `visual` | `target_widget`, `flash_color`, `flash_duration_ms` | Flash target widget with color at interval |
| `log` | `log_level`, `log_message` | Write message to log file or console |
| `popup` | `popup_title`, `popup_message` | Show tkinter messagebox dialog |
| `set_variable` | `target_variable`, `target_value` | Set another state variable |
| `sound` | `frequency`, `duration_ms` | Play beep (platform-dependent) |

Multiple actions can be assigned to a single alarm. Actions execute in order.

#### 5.4.4 Cooldown

Cooldown prevents alarm spam by enforcing a minimum interval between triggers. With 5-second cooldown, an alarm at t=3s is suppressed if the previous trigger was at t=0s.

#### 5.4.5 Alarm Priority

| Severity | Visual Indicator | Default Flash Color | Log Prefix |
|----------|-----------------|---------------------|------------|
| `info` | Subtle highlight | `#89b4fa` (blue) | `[INFO]` |
| `warning` | Moderate flash | `#f9e2af` (yellow) | `[WARN]` |
| `critical` | Intense flash | `#f38ba8` (red) | `[CRIT]` |

---

### 5.5 Lab Templates

Five built-in templates provide pre-configured starting points for common lab GUI patterns.

#### 5.5.1 Multimeter Readout

**Purpose**: Read voltage/current/resistance from a bench multimeter.

**Pre-placed widgets**: Instrument Readout (large numeric display), Label ("Voltage Monitor"), Button ("Read"), Button ("Stop"), Checkbutton ("Continuous Mode"), Text (log output area).

**Pre-configured**: State variables `voltage` (DoubleVar) and `is_running` (BooleanVar). Instrument: Keysight 34401A with `read_voltage` command.

---

#### 5.5.2 Serial Monitor

**Purpose**: Interactive serial communication with instruments.

**Pre-placed widgets**: Serial Monitor (composite: Text output + Entry input + Send button), Button ("Connect"), Button ("Clear"), Checkbutton ("Auto-scroll"), Label (status indicator).

**Pre-configured**: Serial port default COM3 /dev/ttyUSB0, baud 9600, line endings \r\n.

---

#### 5.5.3 Data Logger

**Purpose**: Log multiple sensor readings to CSV with file rotation.

**Pre-placed widgets**: Data Logger (composite: status display + controls), Plot Canvas (real-time trend), Label ("Logging Status"), Button ("Start Logging"), Button ("Stop Logging"), Progressbar (buffer fill indicator).

**Pre-configured**: Data logger with 3 sources (voltage, current, temperature). CSV format with ISO8601 timestamps. 10 MB file rotation, 7-file retention, 1-second logging interval.

---

#### 5.5.4 Calibration UI

**Purpose**: Step-by-step calibration wizard with reference value entry.

**Pre-placed widgets**: LabelFrame ("Step 1: Zero Offset"), Entry (reference value), Label (instruction text), Button ("Next Step"), Button ("Abort"), Progressbar (overall progress), Label (current error display).

**Pre-configured**: State variables `step` (IntVar), `ref_value` (DoubleVar), `error` (DoubleVar). 5-step calibration flow.

---

#### 5.5.5 Oscilloscope Display

**Purpose**: Display waveform data from an oscilloscope with channel controls.

**Pre-placed widgets**: Plot Canvas (large, dual-trace), Label ("CH1" / "CH2" channel indicators), Scale (timebase adjustment), Scale (voltage per division), Button ("Trigger"), Button ("Single"), Label (status display).

**Pre-configured**: State variables `ch1_data`, `ch2_data` for waveform data. Instrument: Tektronix TDS1002 with `read_waveform` command. Plot with 1000-point history, auto-scaling axes.

---

### 5.6 Real-Time Data Considerations

#### 5.6.1 Thread Safety

tkinter is **not thread-safe**. All widget updates must occur on the main thread. The generated code uses `root.after(0, callback)` to marshal updates:

```python
# WRONG: Direct variable update from daemon thread
self.var_voltage.set(new_value)  # May crash or corrupt

# CORRECT: Via root.after()
self.root.after(0, lambda v=new_value: self.var_voltage.set(v))
```

This pattern is automatically generated for all instrument polling, data logging, and alarm monitoring threads.

#### 5.6.2 Update Rates

| Source | Typical Interval | Max Recommended | Notes |
|--------|-----------------|-----------------|-------|
| VISA polling | 100-500 ms | 50 ms | Limited by instrument response time |
| Serial polling | 50-200 ms | 20 ms | Limited by baud rate and line buffering |
| Data logging | 1-10 s | 100 ms | Limited by file I/O |
| Alarm checking | 100-500 ms | 50 ms | CPU-light checks |
| Plot updates | 100-500 ms | 50 ms | Matplotlib canvas.draw() is expensive |

#### 5.6.3 Performance Monitoring

Generated code includes optional timing instrumentation:

```python
_DEBUG_TIMING = False
if _DEBUG_TIMING:
    import time
    _last_poll = time.time()
    elapsed = (time.time() - _last_poll) * 1000
    print(f"[DEBUG] Poll cycle: {elapsed:.1f} ms")
```

---

### 5.7 Error Handling Strategy

#### 5.7.1 Instrument Errors

| Error Type | Cause | Generated Response |
|------------|-------|-------------------|
| Connection refused | Instrument powered off or wrong address | Log error, retry with backoff, update status indicator |
| Timeout | No response within timeout_ms | Log error, retry 3x then stop polling |
| Parse error | Unexpected response format | Log raw response + error, skip update |
| Resource busy | Another process using instrument | Retry after 1 second, log warning |
| Permission denied | No access to serial port | Log error, suggest sudo chmod or udev rule |

#### 5.7.2 Data Logger Errors

| Error Type | Cause | Generated Response |
|------------|-------|-------------------|
| Disk full | No space for log file | Log error, stop logging, notify user |
| Permission denied | No write access to directory | Log error, try /tmp fallback |
| File locked | Log file open in another program | Retry 3x, skip write if still locked |
| Path not found | Directory does not exist | Auto-create with os.makedirs |

#### 5.7.3 Alarm Errors

| Error Type | Cause | Generated Response |
|------------|-------|-------------------|
| Source variable deleted | Variable referenced but not defined | Skip check, log warning |
| Target widget deleted | Visual action target does not exist | Skip visual action, execute other actions |
| Math error | Division by zero in transform | Log error, skip update |
| Type mismatch | Comparing incompatible types | Log error, skip check |

#### 5.7.4 Recovery Patterns

**Exponential backoff for reconnection**:

```python
retry_delay = 1.0  # Start at 1 second
max_retry_delay = 60.0

while self._polling and not connected:
    try:
        self.instr = rm.open_resource(resource_string)
        connected = True
        retry_delay = 1.0  # Reset on success
    except Exception as e:
        print(f"Reconnect failed: {e}, retrying in {retry_delay}s")
        time.sleep(retry_delay)
        retry_delay = min(retry_delay * 2, max_retry_delay)
```

**Graceful shutdown**:

```python
def on_closing(self):
    self._polling = False
    self._logging = False
    self._alarm_running = False
    self._poll_thread.join(timeout=2.0)
    self._log_thread.join(timeout=2.0)
    if hasattr(self, 'instr') and self.instr:
        self.instr.close()
    self.root.destroy()
```


---

## 6. Phase 1 Implementation Roadmap

This roadmap delivers a complete, self-contained web application for designing Python tkinter GUIs for lab environments. The implementation is organized into 10 milestones spanning approximately 12 weeks for a single developer, or 6 weeks for a team of two developers working in parallel.

### 6.1 Milestone Definitions

| Milestone | Features | Effort | Dependencies |
|-----------|----------|--------|-------------|
| **M1: Project skeleton + canvas** | React + TypeScript + Vite project setup; Tailwind CSS configuration; dark theme tokens; CanvasArea component with CSS Grid layout; HTML5 Canvas 2D overlay layer; zoom and pan with CSS transforms; snap-to-grid and visual grid overlay; basic mouse event handling on canvas | 1 week | None |
| **M2: Core widget system** | Widget palette with draggable items (13 core widget types + Lab widgets); DOM-based wireframe rendering for all widget types; widget creation via drag-and-drop from palette; widget selection with bounding box and resize handles; multi-select via Ctrl+click and marquee; drag-to-move on canvas with real-time position update; resize with 8 handles; smart guides (edge alignment); snap-to-grid integration; widget tree panel with basic rendering; basic properties panel (geometry: X, Y, W, H) | 2 weeks | M1 |
| **M3: Project infrastructure** | Undo/redo system with Immer patches (200-entry history, rapid operation compression); keyboard shortcuts (all shortcuts in Section 2.5); project save/load via File System Access API with fallback; `.gui.json` serialization; auto-save to localStorage (30-second interval); recent projects list; new project modal with template gallery; event log panel; context menus (canvas + widget); clipboard (copy/cut/paste/duplicate); keyboard nudge (1px and 10px) | 1 week | M2 |
| **M4: Code generation** | TkinterGenerator class with visitor pattern; code generation for all 13 core widget types; `place()` layout generation; import statement collection; CodeBuilder utility with indentation management; class-based code structure template (with docstrings); flat code structure option; Web Worker integration for non-blocking generation; Monaco Editor code panel with Python syntax highlighting; auto-scroll to widget code on selection; syntax validation via AST parse indicator; export modal with options (filename, style, docstrings, type hints); one-click `.py` file download; copy to clipboard | 1.5 weeks | M2 |
| **M5: Grid Container** | GridContainer widget type with row/column configuration; child widget placement via `grid()` layout in generated code; row/column weight and minsize support; sticky option for grid children; grid padding (padx, pady); rowspan and colspan; visual grid lines on canvas (row/column dividers); grid cell highlight on hover; Properties panel layout section for grid children | 1 week | M4 |
| **M6: Lab templates** | Template system with JSON-based template definitions; 5 built-in templates (Multimeter Readout, Serial Monitor, Data Logger, Calibration UI, Oscilloscope Display); template loading on project creation; template card rendering in left sidebar; Empty Project option; template metadata (name, description, thumbnail, widget count); user-defined template save/load (future: from current project) | 1 week | M2 |
| **M7: State variables** | State Variables panel with variable list (name, type badge, default value); State Variable Editor modal (name, type, default, format, min/max, description); Python identifier validation; 4 variable types (StringVar, IntVar, DoubleVar, BooleanVar); variable binding in Properties panel ("Bind to Variable" dropdown); widget binding code generation (`textvariable`/`variable`); format string code generation (trace-based); variable deletion with cascade unbinding; State Variables tab progressive disclosure | 1 week | M4 |
| **M8: Instrument binding** | Instruments panel with instrument list (name, type badge, connection string); Instrument Configuration modal (Connection/Commands/Polling tabs); VISA support (resource string, backend, timeout, terminations); Serial support (port, baud, data bits, parity, stop bits, flow control); Mock instrument support (sine wave simulation); Command definition table (name, send, parse type, parse expression, transform); Test connection button; Polling configuration (enable, interval, error handling); Instrument method code generation; Polling thread code generation (daemon thread); instrument cleanup code generation; command-response template system; Instruments tab progressive disclosure | 1.5 weeks | M7 |
| **M9: Data logging + alarms** | Data Logger widget and panel configuration; Log source selection (state variables); CSV and JSON format code generation; File rotation code generation (size-based); Data logging daemon thread code generation; timestamp formatting (ISO8601, Unix_ms, Elapsed_ms); Alarm configuration panel; 11 condition types (gt, lt, in_range, out_of_range, rate_of_change, stale_data, deviation, etc.); Hysteresis code generation; Alarm action code generation (visual flash, log, popup, set_variable); Cooldown code generation; Alarm monitoring daemon thread code generation; Error handling for all alarm scenarios | 1 week | M8 |
| **M10: Polish** | Bug fixes from integration testing; Performance optimization (viewport culling, memoization, debouncing); responsive layout refinement (narrow screen handling); color contrast and accessibility pass; keyboard shortcut validation and fixes; cross-browser testing (Chrome, Firefox, Edge, Safari); code generation edge case handling; documentation (inline comments, README); GitHub Actions CI/CD pipeline; GitHub Pages deployment; Service Worker for offline caching; PWA manifest; favicon and app icons; final integration test with all 5 templates | 1 week | All |

### 6.2 Effort Summary

| Phase | Duration (1 dev) | Duration (2 devs) |
|-------|-----------------|-------------------|
| M1-M2 (Foundation) | 3 weeks | 1.5 weeks |
| M3-M4 (Project + Code) | 2.5 weeks | 1.5 weeks |
| M5-M7 (Advanced Widgets) | 3 weeks | 1.5 weeks |
| M8-M9 (Lab Domain) | 2.5 weeks | 1.5 weeks |
| M10 (Polish) | 1 week | 1 week |
| **Total** | **~12 weeks** | **~6-7 weeks** |

### 6.3 Parallel Development Strategy (2 Developers)

**Developer A (Frontend + Canvas)**:
- M1: Canvas engine, zoom/pan, grid
- M2: Core widgets, palette, DnD
- M3: Undo/redo, shortcuts, save/load
- M5: Grid Container
- M6: Lab templates
- M10: Polish, deployment

**Developer B (Code Generation + Lab Domain)**:
- M4: Code generation (all widget types)
- M7: State variables
- M8: Instrument binding
- M9: Data logging + alarms
- M10: Integration, testing, polish

### 6.4 Definition of Done (Phase 1)

- [ ] All 13 core widget types render correctly on canvas with wireframes
- [ ] All widget types generate valid Python tkinter code
- [ ] Widgets can be added, moved, resized, selected, and deleted
- [ ] Undo/redo works for all operations with 200-entry history
- [ ] Projects can be saved and loaded as `.gui.json` files
- [ ] Generated `.py` files run without errors (tested with all 5 templates)
- [ ] State variables bind correctly to widget properties
- [ ] VISA and Serial instruments initialize and poll correctly
- [ ] Data logger writes CSV files with proper rotation
- [ ] Alarms trigger and reset correctly with hysteresis
- [ ] Application deploys to GitHub Pages and works offline
- [ ] Keyboard shortcuts functional for all primary operations
- [ ] Dark theme renders correctly on Chrome, Firefox, and Edge

---

## 7. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| R1 | **Monaco Editor bundle too large** | High | Medium | Use `monaco-editor-webpack-plugin` with only Python language features loaded. Lazy-load editor chunk. Use CodeMirror 6 as fallback if bundle exceeds 500KB gzipped. |
| R2 | **Canvas performance degrades at 100+ widgets** | Medium | High | Implement viewport culling (only render visible widgets). Use `React.memo` on all widget components. Optimize Canvas 2D overlay rendering. Benchmark early in M2 and adjust if needed. |
| R3 | **Generated tkinter code has edge case bugs** | Medium | High | Extensive test matrix: all 13 widget types x 2 layout modes x 2 code styles (flat/class). AST validation on every generated file. Integration testing with actual tkinter execution. Property boundary testing (empty strings, zero sizes, special characters). |
| R4 | **Undo history memory usage grows unbounded** | Medium | Medium | 200-entry max depth with patch compression. Memory monitoring with automatic pruning. Checkpoint-based history (every 10th entry is a full snapshot). Clear history on explicit user action. |
| R5 | **Lab instruments have vendor-specific quirks** | High | Medium | Command template system handles vendor variations. Mock instrument mode enables full testing without hardware. Community-contributed instrument templates. Parse expression customization for non-standard responses. |
| R6 | **File System Access API not supported in all browsers** | Medium | High | Fallback to traditional `<input type="file">` and `<a download>` for all file operations. Feature detection with graceful degradation. No critical feature depends exclusively on FSA API. |
| R7 | **GitHub Pages deployment has routing issues** | Low | High | Configure `vite.config.ts` with `base: '/repo-name/'`. Use HashRouter for client-side routing. Test deployment on a staging repo before production. |
| R8 | **Developer leaves project mid-implementation** | Low | High | Modular architecture with clear boundaries enables new developer onboarding. Comprehensive architecture document (this doc). Well-typed TypeScript code is self-documenting. Each milestone is independently deliverable. |
| R9 | **Browser security policies block clipboard or downloads** | Low | Medium | Clipboard API with `document.execCommand` fallback. Download via `Blob` + `URL.createObjectURL` (universally supported). Toast notifications guide users if browser blocks actions. |
| R10 | **Scope creep: user requests PyQt/ttkbootstrap export** | Medium | Low | Architecture supports multiple generator backends (IR is framework-agnostic). PyQt generator could be a Phase 2 milestone. ttkbootstrap support is a generator plugin, not an architecture change. Document as "planned for future phase" to manage expectations. |

### 7.1 Risk Heat Map

```
Impact
  High | R2(canvas perf)  R3(code bugs)
       | R6(FSA API)     R8(dev turnover)
       |
Medium | R1(Monaco size) R4(undo memory) R5(instrument quirks)
       | R7(GH Pages)    R10(scope creep)
       |
  Low  | R9(clipboard)
       |
       +---------------------------------------------------
       Low        Medium          High
                         Likelihood
```

---

## 8. Glossary

| Term | Definition |
|------|------------|
| **Alarm** | A monitoring rule that checks a state variable against a condition and executes actions when triggered. See Section 5.4. |
| **Canvas** | The primary design surface where widgets are placed, moved, and edited. Supports zoom, pan, grid, and selection. |
| **Canvas Space** | The logical coordinate system of the design surface. Widget positions are stored in canvas coordinates (pixels, 0,0 = top-left of tkinter window). |
| **Code Generation Pipeline** | The process of converting the IR into runnable Python tkinter code, running in a Web Worker with debounced updates. |
| **Cooldown** | A time-based lockout that prevents an alarm from re-triggering too frequently. See Section 5.4.4. |
| **Data Logger** | A background thread that writes state variable values to a file (CSV or JSON) at regular intervals. See Section 5.3. |
| **DOM-based Rendering** | Using HTML DOM elements (divs) rather than HTML5 Canvas for rendering widgets, enabling native event handling and CSS styling. |
| **Grid Container** | A special container widget that uses tkinter's `grid()` geometry manager for child layout, providing structured row/column-based positioning. |
| **Grid Snap** | A feature that rounds widget positions and sizes to the nearest grid multiple when moving or resizing. |
| **Hysteresis** | A deadband around an alarm threshold that prevents rapid on/off toggling (flapping) when the measured value oscillates near the threshold. See Section 5.4.2. |
| **Immer** | An immutability library that uses copy-on-write to produce immutable updates with minimal performance cost. Used for undo/redo patches. |
| **Instrument** | A lab device connected via VISA, Serial, TCP, or Mock protocol. Defined in the IR with commands, polling config, and connection parameters. |
| **IR (Intermediate Representation)** | The `.gui.json` file that serves as the single source of truth for a project. Contains all widgets, state variables, instruments, data loggers, and alarms. |
| **Lab Template** | A pre-configured project with pre-placed widgets, state variables, and instrument definitions for a common lab use case. |
| **Layout Method** | The tkinter geometry manager used to position widgets: `place()` (absolute), `grid()` (row/column), or `pack()` (flow). |
| **Mock Instrument** | A simulated instrument that generates synthetic data for testing without physical hardware. |
| **PEP8** | Python Enhancement Proposal 8 - the style guide for Python code. Generated code follows PEP8 conventions (4-space indentation, naming conventions, line length). |
| **place()** | tkinter's absolute positioning geometry manager. Widgets are placed at exact (x, y) coordinates with explicit width and height. |
| **Progressive Disclosure** | A UX design pattern that surfaces features gradually based on user experience level, preventing overwhelm for new users. |
| **Smart Guides** | Visual alignment lines that appear when dragging a widget near the edge or center of another widget, aiding precise positioning. |
| **Snap-to-Grid** | A feature that constrains widget positions and sizes to a regular grid interval (default 8px). |
| **State Variable** | A typed tkinter variable (StringVar, IntVar, DoubleVar, BooleanVar) that provides reactive data binding between widgets, instruments, data loggers, and alarms. |
| **Sticky** | A `grid()` layout option that controls how a widget expands to fill its cell when the cell is larger than the widget. Values: N, S, E, W, or combinations. |
| **Textvariable** | A tkinter widget property that binds the widget's displayed text to a StringVar, enabling automatic updates when the variable changes. |
| **Thread Safety** | The property of code that functions correctly when accessed from multiple threads. tkinter requires all widget updates on the main thread. |
| **VISA** | Virtual Instrument Software Architecture - a standard API for communicating with test and measurement instruments via GPIB, USB, Ethernet, or Serial. |
| **Viewport Culling** | An optimization technique that skips rendering widgets outside the visible canvas area, improving performance with many widgets. |
| **Visitor Pattern** | A design pattern where operations on widget types are separated from the widget data structure, enabling clean code generation per widget type. |
| **Web Worker** | A browser API that runs JavaScript in a background thread, enabling code generation without blocking the UI. |
| **Wireframe** | A simplified visual representation of a widget on the canvas, showing its position, size, and basic styling without full theming. |
| **Z-Index** | The stacking order of widgets. Higher z-index widgets render on top of lower z-index widgets. Controlled via the Widget Tree panel ordering. |
| **Zod** | A TypeScript-first schema validation library used to validate IR JSON at runtime with full type inference. |
| **Zustand** | A minimal state management library for React with selector-based subscriptions to prevent unnecessary re-renders. |

---

*Document Version: 1.0*  
*Last Updated: 2026-05-07*  
*Status: Implementation-Ready*

