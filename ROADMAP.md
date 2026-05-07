# LabGUI Builder — Development Roadmap

## Status: Phase 1 MVP Core Complete

---

## A. Core GUI Builder — Polish & UX

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| A1 | **Smart Guides** | Show alignment lines when dragging widgets near each other (center, edge, baseline) | 2h |
| A2 | **Multi-Select** | Ctrl+Click to select multiple widgets; move/resize as group | 2h |
| A3 | **Distribute & Align** | Toolbar buttons: align left/center/right, distribute horizontally/vertically | 1.5h |
| A4 | **Canvas Zoom to Mouse** | Zoom should center on mouse cursor position, not top-left | 1h |
| A5 | **Widget Search** | Filter widget palette by typing | 30m |
| A6 | **Undo/Redo with Descriptions** | Show "Undo: Add Button" tooltip on hover | 1h |
| A7 | **Auto-Save to localStorage** | Recover unsaved work on browser crash/refresh | 1.5h |
| A8 | **Import Image Assets** | Allow users to upload icons/images referenced by widgets | 2h |

---

## B. Code Generator — Lab Features Generate Real Python

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| B1 | **State Variable Codegen** | Generate `StringVar`/`DoubleVar`/`IntVar`/`BooleanVar` with `trace_add` | 1h |
| B2 | **Data Logger Codegen** | Generate threaded CSV logger class with rotation, interval polling | 2.5h |
| B3 | **Alarm Monitor Codegen** | Generate threaded alarm checker with hysteresis, visual flash | 2h |
| B4 | **Instrument Auto-Detect** | Generate `detect_visa_instruments()` function in exported code | 1.5h |
| B5 | **Theme Application** | Apply selected ttk theme in generated code: `ttk.Style().theme_use('clam')` | 30m |
| B6 | **Export as Module** | Option to export as `class MyApp` vs standalone script vs importable module | 1.5h |
| B7 | **PEP8 Formatting** | Run `black` or emit clean formatting automatically | 1h |

---

## C. Python Preview Backend (FastAPI + tkinter screenshot)

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| C1 | **FastAPI Server** | Local Python server that receives IR JSON, generates code, runs it | 1.5h |
| C2 | **Off-Screen Render** | Use `pyvirtualdisplay` (Linux) or hidden window + `PIL.ImageGrab` to capture | 2h |
| C3 | **Screenshot API** | `POST /preview` → returns PNG bytes of rendered tkinter window | 1h |
| C4 | **WebSocket Stream** | Stream screenshots at 5 FPS while user drags widgets for near-live preview | 2h |
| C5 | **Browser Integration** | "Live Preview" toggle in LabGUI that shows actual rendered widget image | 1.5h |
| C6 | **Error Reporting** | If generated code crashes, return traceback to browser and show in panel | 1h |

> ⚠️ **Platform Notes**: Off-screen tkinter rendering is OS-specific. Windows can use `win32gui` + `PIL`. macOS requires `screencapture` or Quartz. Linux uses `Xvfb`/`pyvirtualdisplay`. The MVP target is Windows + Linux.

---

## D. Quality & Testing

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| D1 | **Generator Golden Tests** | 10 canonical IR documents → expected `.py` snapshots; fail on diff | 2h |
| D2 | **IR Schema Validation** | Zod runtime validation on load/save to prevent corruption | 1.5h |
| D3 | **Canvas Interaction Tests** | Playwright tests for drag-drop, select, resize | 2h |
| D4 | **Build CI** | GitHub Actions: lint + test + build on PR | 1h |

---

## E. Phase 2 — Grid Layout Visual Editor

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| E1 | **Grid Overlay** | Show row/column lines inside GridContainer on canvas | 2h |
| E2 | **Cell Assignment** | Drop widgets into grid cells; set row/col/span/sticky in properties | 2h |
| E3 | **Grid Codegen** | Emit `grid(row=..., column=..., sticky=...)` instead of `place()` | 1.5h |
| E4 | **Row/Column Weights** | Configure resize weights in properties panel | 1h |
| E5 | **"Suggest Grid" Assistant** | Analyze absolute layout and propose grid structure (not auto-convert) | 4h |

---

## F. Phase 2 — More Widgets

| # | Widget | Generator Support | Canvas Preview | Effort |
|---|--------|-------------------|----------------|--------|
| F1 | **Progressbar** | `ttk.Progressbar` | Horizontal bar | 30m |
| F2 | **Treeview** | `ttk.Treeview` | Table with headers | 1h |
| F3 | **Menubutton** | `tk.Menubutton` | Dropdown button | 1h |
| F4 | **Message** | `tk.Message` | Wrapped label | 30m |
| F5 | **Separator** | `ttk.Separator` | Horizontal line | 30m |
| F6 | **Scrollbar** | `tk.Scrollbar` | Paired with Listbox/Text/Canvas | 1.5h |

---

## G. Phase 2 — Monaco Editor for Event Handlers

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| G1 | **Monaco Integration** | Replace textarea with `@monaco-editor/react` for Python syntax highlighting | 1.5h |
| G2 | **IntelliSense** | Auto-complete `self.` widget names and state variables | 2h |
| G3 | **Lint on Type** | Basic Python syntax error detection before export | 1.5h |

---

## H. Phase 3 — Desktop App Wrapper (PySide6)

| # | Feature | Detail | Effort |
|---|---------|--------|--------|
| H1 | **PySide6 Shell** | Native window with `QWebEngineView` loading the built frontend | 3h |
| H2 | **Native File Dialogs** | `QFileDialog` for save/load instead of browser APIs | 1h |
| H3 | **Native Live Preview** | Direct Python subprocess calls (no HTTP/WebSocket latency) | 2h |
| H4 | **Offline Bundle** | Bundle frontend assets into Qt resources | 1.5h |
| H5 | **Installer** | `pyinstaller` + NSIS/InnoSetup for Windows MSI | 2h |

---

## Recommended Execution Order

1. **B1-B3** — Make lab features actually generate code (highest user value)
2. **C1-C3** — Preview backend (biggest "wow" factor, addresses trust gap)
3. **A1-A3** — Canvas polish (competitive with PAGE/Qt Designer)
4. **D1** — Generator tests (prevents regressions as we add features)
5. **E1-E4** — Grid layout (tkinter users need this badly)
6. **F1-F6** — More widgets (incremental value)
7. **G1** — Monaco for events (professional feel)
8. **H1-H5** — Desktop wrapper (Phase 3)
