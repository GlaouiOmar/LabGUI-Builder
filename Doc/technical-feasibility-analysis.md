# Technical Feasibility Analysis: Visual GUI Builder for Lab Environments

## Executive Summary

This architecture is **ambitious but achievable in phases**, with several components that are significantly harder than they appear. The core IR→Code pipeline is sound. The "Themed Preview" and "WebBox HTML→Canvas translation" are the two biggest engineering booby traps. The "Convert to Grid" algorithm has hidden complexity that will produce unusable spaghetti code without substantial constraint-satisfaction engineering. The Phase 3 desktop wrapper decision (Electron/Tauri vs PySide6) should be made **now**, not deferred, because it affects the entire canvas rendering architecture.

**Overall verdict**: Phases 1 and 2 are doable with a 3-4 person team over 6-9 months. Phase 3 is where projects like this go to die — it fundamentally changes the runtime architecture. Start with a **PySide6 desktop app from day one** if the team has Qt experience; otherwise the web MVP path is valid but you'll rebuild significant portions in Phase 3.

---

## 1. Themed Preview: Hand-Crafted CSS Mimicking ttk Themes

**Effort Estimate: Hard | Risk: High**

### What Sounds Easy
"Just write CSS that looks like ttk Clam/Alt/Vista/Aqua. Buttons, entries, dropdowns — it's all rectangles and borders."

### What It Actually Takes

**The gap between CSS replica and actual ttk is LARGE and NON-OBVIOUS:**

1. **Font Rendering Divergence (Uncloseable gap)**: 
   - tkinter on Windows uses GDI (or DirectWrite on newer Python). macOS uses CoreText. Linux uses FreeType/Pango.
   - Each has different hinting, subpixel layout, and line-height calculation.
   - A label at `size: 10` in tkinter on Windows will have different **actual pixel dimensions** than the same CSS at `font-size: 10px` in Chrome.
   - This means your "pixel-perfect" replica will be off by 2-8 pixels per widget, accumulating into layout drift across a 20-widget form.
   - **Mitigation**: Accept that Themed mode is "close enough" — a visual approximation, not pixel-identical. This is a product decision, not a technical one.

2. **Platform-Specific Metrics (Hard)**:
   - ttk Combobox on Windows has a native dropdown arrow with platform-specific metrics (14x21 on Win10, different on Win11).
   - ttk Scale (slider) has different track heights and thumb sizes per platform.
   - ttk Notebook tabs have platform-specific padding and border behaviors.
   - You'd need per-platform CSS variants. That's 3 platforms × ~15 widgets × 2-3 variants each = ~100 CSS widget definitions minimum.
   - **Each ttk theme (clam, alt, classic, vista, aqua) has different metrics.** Clam is the most cross-platform consistent; Vista and Aqua are deeply native.

3. **Dynamic ttk Styling (Very Hard)**:
   - ttk widgets have state-based styling: `normal`, `active`, `disabled`, `focus`, `pressed`, `selected`, `background`, `readonly`, `alternate`.
   - The map/layer system in ttk means a widget can have multiple states simultaneously (e.g., `disabled + selected`).
   - Replicating this in CSS requires complex `:focus`, `:hover`, `:disabled` combinators plus state classes, and you need to mirror ttk's priority resolution.
   - A ttk style definition like `style.map('TButton', background=[('active', '#388E3C'), ('pressed', '#1B5E20'), ('disabled', '#9E9E9E')])` maps to ~20 lines of CSS per widget.

4. **ttk Theme Engine Internals**:
   - ttk themes are NOT just CSS-like property bags. They define layout elements (like the "focus ring" inside a button, which is a separate drawable element).
   - The Clam theme defines button layout as: `Button.focus { Button.padding { Button.label } }` — nested elements with their own styles.
   - CSS `box-shadow` and `outline` approximate this but don't replicate the exact rendering order.

### Realistic Assessment

| Theme | CSS Replication Accuracy | Effort |
|-------|------------------------|--------|
| Clam | 85-90% | 2-3 weeks |
| Alt | 80-85% | 1-2 weeks |
| Vista (Windows native) | 60-70% | 4-6 weeks |
| Aqua (macOS native) | 55-65% | 4-6 weeks |
| Classic | 80-85% | 1-2 weeks |

**The Vista and Aqua themes are native OS widgets.** You cannot replicate them faithfully in CSS. You can get "recognizably similar" at best. The glossy gradients, animated focus rings, and system color integration are OS-level APIs.

### Recommendation
- Limit Themed mode to **Clam and Alt only** for Phase 1. These are the cross-platform themes and are most CSS-replicable.
- Document Themed mode as "approximate visual reference" not "pixel-perfect preview."
- Invest engineering effort into **Live Preview** instead — it's the only path to true accuracy. Themed mode is a nice-to-have that will never be accurate enough for production UI work.

---

## 2. Live Preview via WebSocket: Real Widgets → Screenshots → PNGs

**Effort Estimate: Hard | Risk: High**

### Architecture
```
Designer (Browser/Canvas) ←──WebSocket──→ Local Agent (Python)
                                              |
                                         [tkinter app in subprocess]
                                              |
                                         [screenshot library]
                                              |
                                         [PNG over WebSocket]
```

### Latency Analysis

**Per-frame breakdown (target: 30fps for "interactive feel"):**

| Step | Time | Notes |
|------|------|-------|
| IR serialize + WebSocket send | 1-5ms | Small JSON, local loopback |
| Agent receives + parse | 1-2ms | Trivial |
| tkinter widget destroy/recreate | 10-50ms | Depends on widget count. Destroying and rebuilding 30 widgets is expensive |
| Screenshot capture | 20-100ms | **This is the killer** |
| PNG encode + WebSocket send | 5-20ms | Depends on resolution |
| Browser decode + render | 5-10ms | Canvas `drawImage` |
| **Total per frame** | **42-187ms** | **That's 5-24 fps best case** |

**Screenshot is the bottleneck.** Here's why:

**Cross-Platform Screenshot Challenges:**

1. **Windows (DPI Scaling)**:
   - Windows has per-monitor DPI scaling (100%, 125%, 150%, 200%).
   - `PIL.ImageGrab` or `mss` capture at physical pixels, but tkinter positions are in logical pixels.
   - Result: screenshots are the wrong size, widgets appear at wrong scale.
   - You must query `ctypes.windll.user32.GetDpiForWindow()` and scale accordingly.
   - tkinter 8.6+ has limited HiDPI support; you'll get blurry screenshots on 4K displays.
   - **Workaround**: Force the agent process to run at 96 DPI (`SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_UNAWARE)`), but then tkinter itself looks wrong on HiDPI.

2. **Linux (Wayland)**:
   - Wayland does NOT allow arbitrary window screenshots for security reasons.
   - No global `XGetImage` equivalent. Each compositor (Mutter, KWin, Sway) has its own protocol.
   - You need `xdg-desktop-portal` + `org.freedesktop.portal.Screenshot` — requires user permission dialog each time.
   - **This breaks automated preview entirely on Wayland.**
   - **Workaround**: Run the agent under XWayland, but then HiDPI is broken. Or use `grim` on wlroots compositors only.

3. **macOS**:
   - `screencapture` CLI or `Quartz` API. Both require screen recording permission (user must approve in System Preferences).
   - First launch pops a permission dialog — bad UX for a design tool.
   - Retina displays: screenshots are 2x resolution, must be downscaled.

**Can it run at interactive frame rates?**

- **Dragging a widget**: NO. At 100ms per frame, dragging feels like 10fps slideshow. Unusable.
- **Static preview after edit**: YES. 100-200ms delay after releasing a drag is acceptable.
- **Continuous resize**: NO. Same problem as dragging.

**Realistic UX**: Live Preview is a **"click to refresh" or "auto-refresh on change with debounce"** feature, NOT a real-time mirror. The user drags in Wireframe/Themed mode, then sees the Live preview when they pause.

### Screenshot Optimization Strategies

| Strategy | Speedup | Complexity |
|----------|---------|------------|
| Differential updates (only changed widgets) | 2-5x | Hard — requires widget-level diff |
| PNG → WebP encoding | 1.3x | Easy |
| Binary diffs over WebSocket | 1.2x | Medium |
| Headless OS-level capture (no window manager) | 2x | Hard — platform-specific |
| Widget-level render (draw widget to offscreen pixmap without window) | 5-10x | **This is the right approach** |

**Best approach for tkinter**: Instead of taking a screenshot of a window, render widgets to an offscreen bitmap using `ImageTk.PhotoImage` or widget's internal `winfo_id` + platform API. This avoids the window manager entirely and is 5-10x faster.

**For PyQt**: Use `QWidget.grab()` or render to `QPixmap` offscreen — MUCH faster than OS screenshot.

### Recommendation
- Live Preview is viable as a **deferred refresh** (update after 300ms of idle), not real-time.
- Use framework-native rendering (`QWidget.grab()`, tkinter offscreen bitmap) instead of OS screenshot.
- Wayland on Linux is a genuine problem that requires the agent to run under XWayland or use portal APIs.
- Effort: **6-8 weeks** for robust cross-platform Live Preview.

---

## 3. WebBox: HTML → tkinter Canvas Translation (Option 2)

**Effort Estimate: Extremely Hard | Risk: Critical**

### The Trap
"For simple cases, translate HTML to tkinter Canvas commands."

This sounds like a weekend parser project. It is not. It is a **browser engine**.

### What Subset of HTML/CSS Is "Simple"?

**Definitely doable (1-2 weeks):**
- `<div>` with `background-color`, `border`, `padding`, `margin`
- `<span>` with `color`, `font-size`, `font-family`
- `<p>` with text alignment
- `<img>` (load and draw via PIL → PhotoImage)

**Hard but achievable (4-6 weeks):**
- CSS `display: flex` layout engine on Canvas
- CSS `display: grid` layout engine on Canvas
- `position: absolute/relative` stacking
- Border-radius rendering on Canvas
- Text wrapping and line breaking
- `box-shadow` approximation

**Extremely hard (3-6 months each):**
- Any JavaScript execution (you need a JS engine)
- CSS animations/transitions
- Complex selectors and cascade resolution
- Web fonts loading and rendering
- `<input>`, `<textarea>` interactive elements
- `<table>` layout algorithm (famous for complexity)
- z-index and stacking context
- CSS transforms (rotate, scale, skew)

**The HTML→Canvas translator is a LAYOUT ENGINE.** Layout engines are what took teams of 100+ engineers years to build at Mozilla, Google, and Apple.

### A More Honest Assessment

| Approach | What It Can Render | Effort | Risk |
|----------|-------------------|--------|------|
| **Subset: Static divs + text + images** | Simple styled boxes | 2-3 weeks | Low |
| **Subset + Flexbox layout** | Modern simple layouts | 6-8 weeks | Medium |
| **Subset + Flexbox + basic input** | Forms with styling | 12-16 weeks | High |
| **Full HTML/CSS** | Anything a browser can | 2-5 years | Critical |

### The Real Options Ranked

| Option | Description | Viability |
|--------|-------------|-----------|
| **Option 3: Borderless webview overlay** | Overlay a transparent webview on top of the canvas | **Best for tkinter** — use `pywebview` or embed CEF. The webview handles all HTML/CSS/JS natively. Only works if the canvas is a native window (not a web canvas). |
| **Option 1: tkinterweb/pywebview** | Embed a web rendering engine in the tkinter frame | **Best for generated app** — the exported app embeds a webview. But preview requires the webview to be composited with the canvas. |
| **Option 2: HTML→Canvas translator** | Parse and render HTML on tkinter Canvas | **Do not attempt** — this is a rabbit hole that will consume 6+ months and still produce garbage results. |

### Recommendation

**Kill Option 2 entirely.** Do not build an HTML→Canvas translator. It is the most common engineering trap in GUI builder projects. Instead:

- **For the designer**: Use a real `<iframe>` in the web canvas. The user edits HTML/CSS in a panel; the iframe renders it live. No translation needed.
- **For tkinter export**: Embed `pywebview` or `tkinterweb` (which wraps tkhtml). Document that WebBox requires a web rendering engine dependency.
- **For PyQt export**: `QWebEngineView.setHtml()` — trivial, works perfectly.

The WebBox's "export to tkinter" story is: your app now requires a web rendering engine. That's a reasonable dependency for a lab tool.

---

## 4. ScriptBox Sandboxing: Arbitrary Python That Imports tkinter/PyQt

**Effort Estimate: Hard | Risk: High**

### The Problem
User writes arbitrary Python code that does `import tkinter`, creates widgets, draws on Canvas, imports any pip package. You need to preview it safely.

### Sandboxing Strategies

| Strategy | How | Security | Widget Preview | Effort |
|----------|-----|----------|---------------|--------|
| **Subprocess** | `subprocess.run(['python', user_script.py'])` | Good (OS-level isolation) | Widgets render in separate window | Easy |
| **RestrictedPython** | Zope's restricted execution | Limited (bypass possible) | Direct integration possible | Medium |
| **Docker container** | Run user code in container | Excellent | Need X11/Wayland forwarding | Hard |
| **Separate process + IPC** | Spawn worker process, control via pipe/socket | Good | Worker renders, sends screenshots | Medium-Hard |
| **In-process with restricted builtins** | `exec(code, restricted_globals)` | Poor (Python sandbox is hard) | Direct | Medium |

### The Real Tradeoff

**Security vs. Integration fidelity:**

- **Secure sandbox** (Docker/subprocess) → User widgets render in a separate window, not composited into the designer. UX is poor.
- **Integrated preview** (same process) → Security is hard/impossible. A malicious `__import__('os').system('rm -rf /')` will execute.

### Recommended Architecture: Subprocess + Screenshot Loop

```
Designer Canvas
     ↑↓ (WebSocket/IPC)
ScriptBox Agent (separate Python process)
     |
[user_script.py executes]
     |
[temporary tkinter window]
     |
[screenshot → PNG → IPC → Designer]
```

This is essentially the same architecture as Live Preview, but for user code.

### Security Considerations

1. **Even in a subprocess**, user code can:**
   - Read any file the user has permission to read
   - Make network requests
   - Consume all CPU/memory (DoS)
   - Display anything in the temporary window

2. **Mitigations:**
   - Resource limits: `resource.setrlimit` (RLIMIT_CPU, RLIMIT_AS) on Unix
   - Timeout: Kill process after 5 seconds
   - Network isolation: Run in network namespace (Linux) or firewall rules
   - File system: `chroot` jail or container

3. **Windows is particularly hard**: No `fork()`, no `chroot`, no `setrlimit`. Use `job objects` for resource limits.

### Recommendation
- **Phase 1**: Subprocess with timeouts. Accept that sandboxing is "best effort" — this is a dev tool, not a public-facing service. The user is running their own code on their own machine.
- **Phase 2**: Docker container for enterprise environments where security matters.
- **Phase 3**: Full container isolation with X11 forwarding.
- Effort: **4-6 weeks** for subprocess approach, **8-12 weeks** for Docker.

---

## 5. Code Generation: "Convert to Grid" and PEP8 tkinter Output

**Effort Estimate: Hard | Risk: Medium-High**

### Part A: Absolute Position → tkinter Code

This is the EASY part. Given:
```json
"geometry": {"x": 20, "y": 20, "w": 120, "h": 32}
```

Generate:
```python
btn_start = tk.Button(root, text="Start Acquisition")
btn_start.place(x=20, y=20, width=120, height=32)
```

Straightforward. The generator is a template:
```python
def generate_widget(node, parent_var):
    var_name = sanitize(node['id'])
    props = format_props(node['abstract_props'])
    style = format_style(node['style'])
    geo = node['geometry']
    
    lines = [
        f"{var_name} = tk.{node['type']}({parent_var}, {props}, {style})",
        f"{var_name}.place(x={geo['x']}, y={geo['y']}, "
        f"width={geo['w']}, height={geo['h']})"
    ]
    return '\n'.join(lines)
```

**Effort: 1-2 weeks** for basic absolute positioning generator.

### Part B: "Convert to Grid" — The Hidden Monster

This is where the architecture blueprint significantly underestimates complexity.

**The Problem:**
Absolute position widgets at arbitrary pixel coordinates must be converted to `grid()` layout with `row`, `column`, `rowspan`, `columnspan`, `sticky`, `padx`, `pady`, `ipadx`, `ipady`, and `weight`.

**Example of what looks simple but isn't:**

Designer layout (absolute pixels):
```
┌────────────────────────────────────────┐
│ [Label]                                │  y=10, h=20
│ [Entry________________________]        │  y=40, h=25
│ [Label] [Entry_____] [Label] [Entry]  │  y=80, h=20
│ [Button]  [Button]    [Button]         │  y=120, h=30
└────────────────────────────────────────┘
```

Naive grid conversion:
```python
# MACHINE-GENERATED SPAGHETTI — what a naive algorithm produces
label1.grid(row=0, column=0, sticky='w')
entry1.grid(row=1, column=0, sticky='ew')
label2.grid(row=2, column=0)
entry2.grid(row=2, column=1)
label3.grid(row=2, column=2)
entry3.grid(row=2, column=3)
btn1.grid(row=3, column=0)
btn2.grid(row=3, column=1)
btn3.grid(row=3, column=2)
```

But what about:
- Row 0, 1, 2, 3 have different heights — need `rowconfigure` with `minsize` or `weight`?
- Column 0 is wider than column 2 in the original — should they be equal in grid?
- The second row has 4 widgets — what's the column span?
- What if widgets overlap in the designer? (Invalid but possible)
- What if a widget spans "between" rows? (e.g., y=35, height=30 → sits on row boundary)

**The "Convert to Grid" Algorithm Is a Constraint Satisfaction Problem:**

Steps required:

1. **Grid Line Detection**: Find horizontal and vertical lines where widget edges align. 
   - Rounding tolerance: widgets at y=38 and y=40 — same row or different?
   - Must account for user imprecision (snapping to 5px or 10px grid helps)

2. **Row/Column Assignment**: Bin each widget into (row, column) cells.
   - Handle widgets that span multiple rows/columns
   - Handle overlapping widgets (error or merge)

3. **Span Detection**: Determine `rowspan` and `columnspan` by comparing widget edges to grid lines.
   - A widget from column 0 to column 2 has `columnspan=2`

4. **Sticky Inference**: Determine `sticky` from widget alignment within its cell.
   - Widget fills entire cell → `sticky='nsew'`
   - Widget left-aligned → `sticky='w'`
   - Widget centered → `sticky=''` or `sticky='ew'` with `ipadx`

5. **Weight Assignment**: Determine which rows/columns should grow when window resizes.
   - Entirely a heuristic. Common approach: rows with Entry/Text widgets get `weight=1`.
   - Without weight, the grid doesn't resize properly.

6. **Padding Translation**: Convert pixel gaps between widgets to `padx`/`pady` values.
   - `padx` is external padding (space between cells)
   - `ipadx` is internal padding (space inside cell around widget)
   - Getting the right balance requires knowing widget internal padding vs. cell spacing.

**Edge Cases That Break Naive Algorithms:**

| Edge Case | Why It's Hard |
|-----------|---------------|
| **Overlapping widgets** | User dragged widgets on top of each other. Invalid grid — detect and flag. |
| **Partial row alignment** | Widget A at y=10, Widget B at y=15. Are they same row? Need snapping tolerance. |
| **Nested frames** | Designer has groups that should become tkinter Frames with their own grid. Need hierarchy detection. |
| **Mixed positioning** | Some widgets use place(), some use grid() in same parent. tkinter allows this but it's fragile. |
| **Dynamic content** | Label text changes at runtime, affecting grid cell size. `grid()` handles this but `place()` doesn't — conversion changes behavior. |
| **Resize behavior loss** | Absolute position → widgets never move on resize. Grid → widgets reposition. "Convert to Grid" silently changes runtime behavior. |

### What Good Generated Code Looks Like

```python
class MyApp:
    def __init__(self, root):
        self.root = root
        root.title("Acquisition Control")
        
        # Configure grid weights for resize behavior
        root.columnconfigure(0, weight=1)
        root.columnconfigure(1, weight=1)
        root.rowconfigure(1, weight=1)  # Entry row expands
        
        # --- Row 0: Title ---
        self.lbl_title = ttk.Label(root, text="Start Acquisition", font=("Segoe UI", 12, "bold"))
        self.lbl_title.grid(row=0, column=0, columnspan=2, sticky='w', padx=10, pady=(10, 5))
        
        # --- Row 1: Name Entry ---
        self.lbl_name = ttk.Label(root, text="Name:")
        self.lbl_name.grid(row=1, column=0, sticky='w', padx=10, pady=5)
        
        self.ent_name = ttk.Entry(root)
        self.ent_name.grid(row=1, column=1, sticky='ew', padx=(0, 10), pady=5)
        
        # --- Row 2: Buttons ---
        self.btn_start = ttk.Button(root, text="Start", command=self.on_start)
        self.btn_start.grid(row=2, column=0, sticky='e', padx=10, pady=10)
        
        self.btn_cancel = ttk.Button(root, text="Cancel", command=self.on_cancel)
        self.btn_cancel.grid(row=2, column=1, sticky='w', padx=(0, 10), pady=10)
```

This requires:
- **Semantic grouping** (which widgets go together visually)
- **Comment insertion** (row separators)
- **Consistent naming** (`lbl_`, `ent_`, `btn_` prefixes)
- **Weight inference** (which rows/columns grow)
- **Method generation** (`on_start`, `on_cancel` stubs)

### Recommendation

1. **Absolute positioning export**: Easy, do this first. It's valid tkinter code. Many internal lab tools use `place()` successfully.

2. **"Convert to Grid"**: This is a **research-grade layout inference problem**. Approaches:
   - **Simple heuristic**: Snap to nearest 10px grid, detect spans by edge alignment. Produces functional but ugly code. (4-6 weeks)
   - **Constraint solver**: Formulate as integer linear programming. Produces better results but requires a solver dependency. (8-10 weeks)
   - **ML-assisted**: Train on hand-written tkinter code → layout pairs. Overkill for Phase 1. (6+ months)

3. **My recommendation**: Implement "Convert to Grid" as a **guided wizard**, not an automatic conversion:
   - Detect suggested grid lines, show them to the user
   - Let user confirm/adjust row/column boundaries
   - Preview the generated code before applying
   - This turns an impossible auto-layout problem into a good assisted-layout feature.

4. **PEP8 compliance**: Easy. Use `black` or `autopep8` as a post-processing step on generated code. (1 week)

---

## 6. Multi-Framework Generator Maintenance

**Effort Estimate: Medium | Risk: Medium**

### How Much Code Sharing Is Realistic?

The IR is framework-agnostic. But the generators are NOT simple templates.

**Example: Button widget IR → code**

```json
{
  "type": "Button",
  "abstract_props": {"label": "OK", "enabled": true},
  "style": {"bg": "#238636", "fg": "#ffffff"}
}
```

**tkinter output:**
```python
btn = tk.Button(parent, text="OK", bg="#238636", fg="#ffffff", state=tk.NORMAL)
```

**PyQt6 output:**
```python
btn = QPushButton("OK", parent)
btn.setStyleSheet("background-color: #238636; color: #ffffff;")
btn.setEnabled(True)
```

**PySide6 output:**
```python
btn = QPushButton("OK", parent)
btn.setStyleSheet("background-color: #238636; color: #ffffff;")
btn.setEnabled(True)
```

Note: PyQt6 and PySide6 are nearly identical (both Qt6). The differences:
- Import paths: `PyQt6.QtWidgets` vs `PySide6.QtWidgets`
- Signal/slot syntax: `button.clicked.connect(handler)` is the same, but some enums differ
- Enum access: `Qt.AlignmentFlag.AlignCenter` (PyQt6) vs `Qt.AlignCenter` (PySide6)

**So really: 2.5 generators, not 3.** PyQt6 and PySide6 share ~90% of generator code.

### Where Abstractions Leak

| Area | tkinter | PyQt/PySide | Leak Severity |
|------|---------|-------------|---------------|
| **Layout model** | `pack`/`grid`/`place` | `QVBoxLayout`/`QHBoxLayout`/`QGridLayout` | **CRITICAL** — fundamentally different paradigms |
| **Styling** | Widget kwargs + ttk styles | `setStyleSheet()` (CSS-like) + QPalette | High — style system is completely different |
| **Events** | `command=` callback | Signal/slot system | Medium — different connection mechanism |
| **Widget types** | `tk.Entry`, `ttk.Combobox` | `QLineEdit`, `QComboBox` | Low — mostly 1:1 mapping |
| **Canvas drawing** | `create_line`, `create_rectangle` | `QPainter` with `paintEvent` | **CRITICAL** — different API shape |
| **Threading** | `root.after()` for async | `QThread`, signals across threads | High — affects event binding codegen |
| **Image handling** | `PIL.ImageTk.PhotoImage` | `QPixmap`, `QImage` | Medium |

### The Layout Problem Is the Big One

tkinter's `grid()` and Qt's `QGridLayout` are deceptively similar but fundamentally different:

- **tkinter grid**: Widgets are placed by cell. Empty cells collapse. Row/column sizes are determined by the largest widget in that row/column. `weight` controls expansion.
- **Qt QGridLayout**: Layout items are placed by cell. Empty cells exist and have size. `setRowStretch`/`setColumnStretch` controls expansion. Minimum sizes are explicit.

Converting between them requires mapping semantics that don't 1:1 translate.

**Code Sharing Architecture:**

```
              IR (framework-agnostic)
                 |
    ┌────────────┼────────────┐
    |            |            |
  BaseGen     BaseGen     BaseGen
  (tkinter)   (PyQt6)     (PySide6)
    |            |            |
  Shared       Shared      Shared (PyQt/PySide)
  Utils        Utils        Utils
```

- **Shared layer**: Widget property mapping (IR `type: "Button"` → `tk.Button` / `QPushButton`), naming utilities, formatting
- **Generator-specific**: Layout code generation, event binding, styling, imports, class structure

### Breaking Changes Risk

| Framework | Breaking Change Frequency | Impact |
|-----------|--------------------------|--------|
| tkinter | Very low (part of stdlib, tied to Python) | Minimal |
| PyQt6 | Medium (annual releases, Riverbank can make breaking changes) | Medium |
| PySide6 | Medium (Qt releases ~every 6 months) | Medium |

PyQt6's 6.4→6.5 transition had enum scoping changes that broke many projects. PySide6 generally tracks Qt more closely and can have surprises.

### Recommendation

- Build the **tkinter generator first**. It validates the IR design.
- **Share code between PyQt6 and PySide6 generators** — they're the same framework with different import prefixes.
- Abstract the layout generation behind an interface: `ILayoutGenerator` with `generate_grid()`, `generate_box()`, etc. Each framework implements its own.
- Budget **2-3 weeks per additional generator** once the first one is done.
- Total: **tkinter (4 weeks) → PyQt6 (3 weeks) → PySide6 (1 week)**.

---

## 7. Phase 3: Electron/Tauri vs PySide6 Desktop Wrapper

**Effort Estimate: Medium-Hard | Risk: Medium**

### Option A: Electron

| Factor | Assessment |
|--------|-----------|
| **Bundle size** | 150-250MB (Chromium + Node) | 
| **Startup time** | 2-5 seconds on first launch |
| **Python interop** | Spawn Python process, communicate via WebSocket/stdio. No direct Python embedding. |
| **WebSocket reliability** | Excellent — Electron has full Node.js networking |
| **Distribution** | electron-builder for Win/Mac/Linux. Auto-updater built-in. |
| **DPI scaling** | Handled by Chromium (generally good) |
| **Native file dialogs** | electron.dialog (works well) |
| **Developer experience** | JavaScript/TypeScript. Large ecosystem. |
| **Long-term maintenance** | High — Chromium updates are heavy, security patches needed frequently |

### Option B: Tauri

| Factor | Assessment |
|--------|-----------|
| **Bundle size** | 3-8MB (Rust native + WebView2 on Windows, WebKit on Mac, WebKitGTK on Linux) |
| **Startup time** | <1 second |
| **Python interop** | Same as Electron — spawn Python process. Tauri has `Command` API for process communication. |
| **WebSocket reliability** | Good — Rust-based, but fewer networking libraries than Node |
| **Distribution** | tauri-bundler. Smaller bundles. No built-in auto-updater (needs plugin). |
| **DPI scaling** | WebView2 handles well on Windows. Linux WebKitGTK can have issues. |
| **Native file dialogs** | Built-in via tauri API |
| **Developer experience** | Rust backend + JS/TS frontend. Smaller ecosystem than Electron. |
| **Long-term maintenance** | Medium — Rust is stable, WebView updates come from OS |

### Option C: PySide6 Desktop App

| Factor | Assessment |
|--------|-----------|
| **Bundle size** | 40-80MB (Qt6 + Python) with PyInstaller |
| **Startup time** | 1-3 seconds |
| **Python interop** | **NATIVE** — Python IS the app. No process separation needed. |
| **WebSocket reliability** | N/A — direct Python calls |
| **Distribution** | PyInstaller, cx_Freeze, or briefcase. Well-documented. |
| **DPI scaling** | Qt handles HiDPI well (Qt6 has improved support) |
| **Native file dialogs** | `QFileDialog` — native on all platforms |
| **Developer experience** | Python + QML or QtWebEngine. If the team knows Python, this is natural. |
| **Long-term maintenance** | Medium — Qt releases regularly but predictably |

### The PySide6 Advantage Nobody Talks About

If you build the **designer canvas in PySide6 using QtWebEngine**, you get:
1. The canvas is a full Chromium browser (same as Electron)
2. The backend IS Python — no WebSocket, no process spawn, no JSON serialization
3. The IR lives as Python objects, not JSON
4. Code generation is a Python function call, not a WebSocket round-trip
5. Live Preview is a `QWidget.grab()` call in the same process

**This eliminates the ENTIRE WebSocket layer and Python agent architecture.** That's 4-6 weeks of engineering saved.

### Decision Matrix

| Criteria | Electron | Tauri | PySide6 |
|----------|----------|-------|---------|
| Bundle size | ★★☆☆☆ | ★★★★★ | ★★★☆☆ |
| Startup time | ★★☆☆☆ | ★★★★★ | ★★★☆☆ |
| Python interop | ★★★☆☆ | ★★★☆☆ | ★★★★★ |
| Dev ecosystem | ★★★★★ | ★★★☆☆ | ★★★★☆ |
| Maintenance burden | ★★☆☆☆ | ★★★★☆ | ★★★★☆ |
| **Overall for this project** | ★★★☆☆ | ★★★☆☆ | **★★★★★** |

### Recommendation

**Use PySide6 for the desktop app from the beginning.** Here's why:

1. The team is clearly Python-focused (tkinter-first, PyQt/PySide generators).
2. Eliminating the WebSocket layer is massive — simpler architecture, lower latency, fewer failure modes.
3. QtWebEngine gives you the same web-based canvas as Electron/Tauri.
4. You can still use React/Vue for the canvas UI — render it inside QtWebEngine.
5. PyInstaller distribution is a solved problem for Python apps.

**If you must stay web-first** (e.g., team has no Qt experience), use **Tauri** over Electron:
- 10x smaller bundle
- 5x faster startup
- Rust is a better long-term foundation than Node for a system tool
- The WebSocket-to-Python architecture you'd need anyway works the same

---

## 8. The Hidden 80%: What's NOT in the Architecture

**Effort Estimate: Extremely Hard collectively | Risk: High**

### A. Undo/Redo
**Effort: Hard | Risk: Medium**

- Every edit to the IR tree must be invertible.
- Implementation: Command pattern. Each operation is a `Command` object with `execute()` and `undo()`.
- Stack-based: undo stack (past), redo stack (future).
- **Complexity**: Composite operations ("move 5 widgets" is one user action but 5 IR mutations). Grouping commands into transactions.
- **Gotcha**: Dragging a widget generates 60 "move" commands per second. You can't push each to the undo stack. Must coalesce into a single "move from A to B" command on mouse-up.
- **Estimate**: 3-4 weeks for robust undo/redo.

### B. Clipboard (Copy/Paste)
**Effort: Medium | Risk: Medium**

- Copy: Serialize selected widgets subtree to JSON, put on clipboard.
- Paste: Deserialize, assign new IDs, adjust positions, merge into IR.
- **Complexity**: Cross-document paste (pasting into a different design file). Conflict resolution if IDs collide. Pasting widgets that reference other widgets (e.g., a Label that references a Variable).
- **Cross-application**: Can't paste into other apps easily without a standard format. Use custom MIME type + JSON.
- **Estimate**: 2 weeks.

### C. Drag-and-Drop Edge Cases
**Effort: Hard | Risk: Medium**

| Edge Case | Why It's Hard |
|-----------|---------------|
| **Multi-select drag** | 5 widgets selected, drag one — all must move. Coordinate transforms get complex. |
| **Snap to grid/guidelines** | Need spatial indexing (R-tree or grid hash) for efficient snap detection. |
| **Drag onto container** | Dropping a widget onto a Frame → reparent in IR tree. Visual feedback during drag (highlight target container). |
| **Nesting depth** | Frame inside Frame inside Frame. Dragging between levels requires hit-testing against nested bounding boxes. |
| **Precision on HiDPI** | Mouse coordinates in CSS pixels vs. actual pixels. 1px misalignment at 200% scaling. |
| **Touch/tablet input** | Different event model. Long-press to initiate drag. |

- **Estimate**: 4-6 weeks for robust drag-and-drop.

### D. Serialization & Schema Migrations
**Effort: Medium-Hard | Risk: Medium**

- Phase 1: Simple JSON save/load. No problem.
- Phase 2: You change the IR schema. Now all saved files are "old format."
- Need migration system: `v1 → v2 → v3` transformers.
- **Common mistake**: Storing schema version in the file and branching migration code. Better: always migrate to latest.
- **Gotcha**: Custom widget plugins (users add their own widget types). Schema becomes dynamic.
- **Estimate**: 1 week for basic versioning, 2-3 weeks for plugin-aware schema.

### E. Error Handling & Recovery
**Effort: Medium | Risk: High**

- Code generator produces invalid Python (edge case in IR → code mapping).
- Generated app crashes on startup (e.g., missing image resource).
- Designer state becomes inconsistent (bug leaves IR in invalid state).
- User's ScriptBox code crashes the agent.
- Need: error boundaries in the canvas, crash recovery for IR, validation on save/load.
- **Estimate**: 2-3 weeks for comprehensive error handling.

### F. DPI Scaling (The Gift That Keeps Giving)
**Effort: Hard | Risk: High**

| Platform | DPI Handling | Problem |
|----------|-------------|---------|
| Windows | Per-monitor DPI (100-300%) | Canvas renders at CSS pixels (96 DPI base), designer places widgets at CSS pixels, but generated tkinter app uses physical pixels. Widgets appear wrong size on HiDPI. |
| macOS | Retina (2x) | Same problem. tkinter doesn't handle Retina well — widgets are tiny on 4K Macs. |
| Linux | Variable (X11), fractional (Wayland) | X11 has `Xft.dpi`. Wayland has per-output scale factors. |

**The fundamental issue**: The designer canvas (web-based, handles DPI internally) and the generated app (tkinter, physical pixels) have different coordinate systems. A 120px wide button in the designer might render as 120px on one monitor and 180px on another in the generated app.

**Mitigation**: All IR geometry should be in "designer pixels" (CSS pixels, 96 DPI base). Generated code includes DPI scaling logic or uses `ttk` which handles some of this.

- **Estimate**: Ongoing pain. 2-3 weeks initial work, issues forever.

### G. Accessibility
**Effort: Hard | Risk: Medium**

- Screen reader support for the designer canvas.
- Keyboard-only operation (tab order, arrow key nudging).
- ARIA labels for canvas elements.
- The generated code must produce accessible UIs (keyboard navigation, focus management).
- **This is almost never in v1 of design tools.** Expect to add it in Phase 3+.
- **Estimate**: 4-6 weeks if done properly. Often deferred indefinitely.

### H. Widget Property Validation
**Effort: Medium | Risk: Medium**

- `font: "Segoe UI"` — validate the font exists on target platform?
- `bg: "#GGGGGG"` — validate color format.
- `geometry.w: -10` — validate positive dimensions.
- Cross-property validation: `border_radius > min(w, h) / 2` means circle, not rounded rect.
- **Need**: Per-widget-type validation schemas. These must be maintained alongside the generators.
- **Estimate**: 2 weeks.

### I. Asset Management
**Effort: Medium | Risk: Low**

- Images referenced by WebBox, icons for buttons, backgrounds.
- Paths break when project is moved to different machine.
- Need: Asset bundling (embed base64 in IR or sidecar file), asset library UI.
- **Estimate**: 2 weeks.

### J. Project Structure & File I/O
**Effort: Medium | Risk: Low**

- Save format: single `.json` file vs. directory with assets + `.json` manifest.
- Single file is easier; directory is better for large projects with many images.
- Recent files list, auto-save, backup files.
- **Estimate**: 1-2 weeks.

---

## Summary: Effort & Risk Matrix

| Component | Effort | Risk | Notes |
|-----------|--------|------|-------|
| IR Design & Core Data Model | Easy | Low | Solid foundation, well-defined |
| Wireframe Preview | Easy | Low | Boxes and labels, straightforward |
| Absolute Position Code Gen | Easy-Medium | Low | Template-based, well-understood |
| JSON Persistence | Easy | Low | Standard serialization |
| WebBox (iframe in designer) | Easy | Low | Native browser rendering |
| **Themed Preview (CSS→ttk)** | **Hard** | **High** | Limited accuracy, per-platform CSS, diminishing returns |
| **Live Preview (WebSocket)** | **Hard** | **High** | Latency issues, Wayland on Linux, not real-time |
| **WebBox HTML→Canvas Translation** | **Extremely Hard** | **Critical** | **DO NOT ATTEMPT** — this is a browser engine |
| ScriptBox Sandboxing | Hard | High | Subprocess approach is viable; true sandbox is hard |
| **"Convert to Grid" Algorithm** | **Hard** | **Medium-High** | Guided wizard recommended over auto-conversion |
| PyQt6/PySide6 Generators | Medium | Medium | Share code between PyQt/PySide; layout is the hard part |
| Undo/Redo | Hard | Medium | Command pattern, transaction grouping |
| Drag-and-Drop | Hard | Medium | Multi-select, nesting, snap, HiDPI |
| **DPI Scaling** | **Hard** | **High** | Ongoing cross-platform pain |
| Serialization Migrations | Medium-Hard | Medium | Versioned schema, plugin-aware |
| Error Handling | Medium | High | Edge cases in code gen, agent crashes |
| Accessibility | Hard | Medium | Usually deferred |
| Phase 3 Desktop Wrapper | Medium-Hard | Medium | **PySide6 recommended over Electron/Tauri** |

---

## Revised Effort Estimates (Team of 3-4 Engineers)

| Phase | Scope | Duration | Key Deliverables |
|-------|-------|----------|-----------------|
| **Phase 1** (MVP) | Wireframe+Themed canvas, absolute positioning, 12 core widgets, WebBox (iframe), tkinter PEP8 export, JSON save/load, basic drag-and-drop | **3-4 months** | Web app that generates working tkinter code |
| **Phase 1.5** | Live Preview (deferred refresh), undo/redo, snap-to-grid, "Convert to Grid" guided wizard | **+2 months** | Usable design tool for lab UIs |
| **Phase 2** | PyQt/PySide generators, ScriptBox, visual event binding, container layouts | **+3 months** | Multi-framework export |
| **Phase 3** | PySide6 desktop app, native live preview, template library, accessibility | **+4 months** | Polished desktop application |
| **Total** | Full vision | **~12-13 months** | 3-4 engineers |

## Top 3 Recommendations

1. **Start with PySide6 desktop, not web.** The WebSocket agent architecture is a massive amount of complexity that exists solely because "web first" was chosen. PySide6 + QtWebEngine gives you the web canvas AND native Python in one process. If the team lacks Qt experience, do the web MVP but plan to throw away the WebSocket layer.

2. **Kill the HTML→Canvas translator.** This is the #1 project-killer in the blueprint. Use webview embedding for WebBox in both designer and generated code. Document the dependency.

3. **Make "Convert to Grid" a guided assistant, not auto-magic.** Auto-layout inference from absolute positions is an unsolved research problem. A good UI that shows suggested grid lines and lets users confirm will be faster to build and produce better results.
