# Technical Architecture Specification
## LabGUI Builder — Browser-based Visual tkinter GUI Designer

**Version**: 1.0  
**Date**: 2025-01-15  
**Status**: Implementation-Ready  
**Target**: Single-page application, pure client-side, zero backend

---

## 1. Technology Stack

### 1.1 Framework: React 18+ with TypeScript

| Layer | Choice | Alternatives Rejected | Rationale |
|---|---|---|---|
| **UI Framework** | **React 18** | Vue, Svelte, Solid, vanilla JS | React's ecosystem maturity, deep tooling for canvas-heavy applications, vast component library availability, and strong typing support make it ideal for a complex design tool. The component model maps naturally to our panel-based layout. React 18's Concurrent Features (useTransition) allow us to debounce expensive code generation without blocking the canvas interaction thread. |
| **Language** | **TypeScript 5.3+ (strict mode)** | JavaScript, moderate TS | Strict mode is non-negotiable for an IR-centric application where type safety across widget definitions, code generation, and serialization prevents entire classes of bugs. The complexity of the widget tree and generator contracts demands compile-time verification. |
| **Build Tool** | **Vite 5+** | Create React App, Next.js, Rollup | Vite provides sub-second HMR critical for rapid UI iteration, produces optimized static bundles for deployment to GitHub Pages/Netlify, and has zero server-side assumptions. Next.js is overkill (no SSR, no API routes, no image optimization needed). CRA is deprecated and slow. |
| **Styling** | **Tailwind CSS 3.4+** | CSS Modules, styled-components, raw CSS | Utility-first approach eliminates CSS file proliferation in a panel-dense application. Tailwind's `className` composition is ideal for dynamically-styled canvas widgets. No runtime CSS-in-JS overhead. Colocated styles reduce context-switching. Dark mode via `dark:` variants. |
| **State Management** | **Zustand 4.4+** | Redux Toolkit, Jotai, React Context, MobX | Zustand provides the minimal API surface of Context without the re-render propagation issues. For a design tool with frequent micro-updates (drag coordinates), Zustand's selector-based subscriptions prevent unnecessary re-renders. Single store for Project IR, separate store for UI state. No boilerplate vs Redux. Jotai considered but Zustand'sImmer integration and devtools are more mature for this use case. |
| **Canvas Rendering** | **DOM-based absolute positioning (hybrid)** | HTML5 Canvas 2D, SVG, WebGL, Konva | **Primary**: Absolutely-positioned `div` elements with wireframe CSS borders for widget rendering. This gives us native DOM event handling, CSS styling, and accessibility without a custom event system. **Overlay layer**: HTML5 Canvas 2D for selection marquee, snap-to-grid indicators, and drag preview — elements that need pixel-perfect control and don't require DOM events. This hybrid approach is used by Figma (C++ canvas) and Retool (DOM) successfully. |
| **Drag & Drop** | **@dnd-kit/core** | react-dnd, native HTML5 DnD, @use-gesture | @dnd-kit's sensor/constraint model is perfect for our multi-context DnD (palette→canvas, canvas→canvas, tree→tree, resize handles). Supports collision detection customization for snap-to-grid. Pointer sensor works with both mouse and touch. Modular (core + sortable + utilities). react-dnd has Touch backend issues; native DnD lacks customization. |
| **Code Editor** | **Monaco Editor (@monaco-editor/react)** | CodeMirror 6, Prism, Ace | Monaco provides the same editing experience as VS Code — critical for lab users already familiar with it. Python syntax highlighting built-in. Minimap, line numbers, and search are free. CodeMirror 6 is lighter but Monaco's feature set aligns with "professional code output" requirement. Loaded dynamically via `loader` prop to keep initial bundle small. |
| **Tree/Panel UI** | **@dnd-kit/sortable + custom tree** | react-arborist, @atlaskit/tree, react-sortable-tree | @dnd-kit/sortable provides the reorder primitives; we build a custom tree component on top for the widget tree panel. This keeps bundle size minimal and gives full control over tree semantics (parent/child widget relationships, indentation, expand/collapse). react-arborist is excellent but adds unnecessary abstraction for our specific widget-tree model. |
| **Icons** | **Lucide React** | FontAwesome, Heroicons, Tabler | Lucide's consistent stroke-width design language matches technical/tooling applications. Tree-shakeable React components (`lucide-react`). No font-loading issues. Clean, modern aesthetic appropriate for lab software. |
| **File Handling** | **File System Access API + fallback** | download.js, StreamSaver, Native File API | File System Access API (`showSaveFilePicker`, `showOpenFilePicker`) provides native "Save" and "Open" dialog experience with `.gui.json` extension filter. Falls back to `URL.createObjectURL` download / `<input type="file">` upload for Firefox/Safari. localStorage for auto-save backup. |
| **Bundler/Deploy** | **Vite → Static → GitHub Pages** | Netlify, Vercel, AWS S3 | GitHub Pages is free, version-controlled, and integrates with GitHub Actions for CI/CD. No server needed. Custom domain support. Zero ongoing cost for open-source lab tools. Netlify/Vercel are viable alternatives with better preview deploys. |

### 1.2 Complete Dependency Manifest

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zustand": "^4.4.7",
    "immer": "^10.0.3",
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@monaco-editor/react": "^4.6.0",
    "monaco-editor": "^0.45.0",
    "lucide-react": "^0.294.0",
    "tailwind-merge": "^2.2.0",
    "clsx": "^2.0.0",
    "nanoid": "^5.0.4",
    "zod": "^3.22.4",
    "dequal": "^2.0.3"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.10",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "@types/react": "^18.2.45",
    "@types/react-dom": "^18.2.18"
  }
}
```

### 1.3 Bundle Size Budget

| Chunk | Target Size | Strategy |
|---|---|---|
| Core App (React + Zustand + IR) | < 150 KB gzip | Tree-shake all imports |
| Canvas Engine | < 50 KB gzip | Code-split, lazy load |
| Monaco Editor | < 350 KB gzip | Dynamic import, load on first CodePanel open |
| Generator Pipeline | < 80 KB gzip | Web Worker, async load |
| @dnd-kit | < 40 KB gzip | Use only core + sortable |
| **Total initial** | **< 250 KB gzip** | Above-the-fold loads first |
| **Total cached** | **< 700 KB gzip** | After all lazy chunks |

---

## 2. Application Architecture

### 2.1 Component Hierarchy

```
App                                 # Zustand Provider, DndContext, theme
├── AppLayout                       # CSS Grid layout definition (3 rows: header/workspace/bottom)
│   ├── Header                      # h-12, flex row, border-b
│   │   ├── ProjectName             # Editable text, double-click to rename
│   │   ├── UndoRedoControls        # Icon buttons, disabled state from history store
│   │   ├── RunPreviewButton        # Generates .py, triggers download
│   │   ├── ExportButton            # Dropdown: Export Python / Save JSON / Load JSON
│   │   └── SettingsMenu            # Dropdown: theme, grid size, snap toggle
│   ├── Workspace                   # flex-1, overflow-hidden, flex row
│   │   ├── LeftSidebar             # w-64, flex col, border-r
│   │   │   ├── TabBar              # Widgets | Templates tabs
│   │   │   ├── WidgetPalette       # Scrollable list of widget categories
│   │   │   │   ├── WidgetCategory  # Collapsible: "Input", "Display", "Layout", "Lab"
│   │   │   │   └── WidgetPaletteItem # Draggable source, @dnd-kit Draggable
│   │   │   └── TemplateGallery     # Grid of template thumbnails
│   │   ├── CanvasArea              # flex-1, relative, overflow-hidden
│   │   │   ├── Canvas              # Absolute-positioned container, applies zoom/pan transform
│   │   │   │   ├── CanvasWidget[]  # Individual widget DOM nodes, memoized
│   │   │   │   └── GridOverlay     # Canvas 2D: dotted grid lines, snap indicators
│   │   │   ├── SelectionOverlay    # Canvas 2D: bounding boxes, resize handles, lasso
│   │   │   ├── ZoomControls        # Bottom-right: zoom %, fit, 1:1 buttons
│   │   │   └── PanOverlay          # Invisible grab layer when spacebar held
│   │   └── RightSidebar            # w-80, flex col, border-l
│   │       ├── TabBar              # Properties | Layers | State | Instruments tabs
│   │       ├── PropertiesPanel     # Dynamic form based on selected widget type
│   │       │   ├── PositionSection # x, y, w, h numeric inputs
│   │       │   ├── StyleSection    # Colors, fonts, border properties
│   │       │   ├── BindingSection  # State variable bindings
│   │       │   └── EventSection    # Command bindings
│   │       ├── WidgetTreePanel     # Sortable tree of all widgets
│   │       ├── StateInspectorPanel # State variable CRUD table
│   │       └── InstrumentsPanel    # Instrument config list
│   └── BottomPanel                 # h-48 (resizable), border-t, flex col
│       ├── TabBar                  # Code | Events tabs
│       ├── CodePanel               # Monaco Editor, read-only Python output
│       └── EventLogPanel           # Scrollable log of user actions
└── DialogLayer                     # Portal container for all modals
    ├── ExportDialog                # Python export options
    ├── NewProjectDialog            # Template selection, project name
    ├── InstrumentConfigDialog      # GPIB/VISA/Serial config form
    ├── StateVarEditorDialog        # Add/edit state variable
    ├── AlarmConfigDialog           # Alarm threshold editor
    └── TemplateSaveDialog          # Save current layout as template
```

#### Key Component Signatures

```typescript
// src/components/layout/App.tsx
export function App(): JSX.Element;

// src/components/canvas/Canvas.tsx
interface CanvasProps {
  zoom: number;
  panOffset: { x: number; y: number };
  snapToGrid: boolean;
  gridSize: number;
}
export function Canvas(props: CanvasProps): JSX.Element;

// src/components/canvas/CanvasWidget.tsx — memoized for performance
interface CanvasWidgetProps {
  widgetId: string;
  isSelected: boolean;
  isMultiSelected: boolean;
  wireframeMode: boolean;
}
export const CanvasWidget: React.MemoExoticComponent<
  (props: CanvasWidgetProps) => JSX.Element
>;

// src/components/panels/PropertiesPanel.tsx
interface PropertiesPanelProps {
  selectedWidgetIds: string[];
}
export function PropertiesPanel(props: PropertiesPanelProps): JSX.Element;

// src/components/dialogs/ExportDialog.tsx
interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  project: ProjectIR;
}
export function ExportDialog(props: ExportDialogProps): JSX.Element;
```

### 2.2 State Management Architecture

#### 2.2.1 Store Separation Strategy

We use **two Zustand stores** to separate persistent project state from transient UI state:

| Store | Persistence | Rehydrate | Scope |
|---|---|---|---|
| `useProjectStore` | `localStorage` (auto-save) + `.gui.json` files | Schema validation + migration | Project-level: widgets, state vars, instruments |
| `useUIStore` | `localStorage` (preferences only) | Direct restore | Session-level: selection, zoom, panels |

#### 2.2.2 Project Store — Complete State Shape

```typescript
// src/store/projectStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

// ── Core IR Types ──────────────────────────────────────────────

export interface WidgetIR {
  id: string;                    // nanoid(), unique within project
  type: WidgetType;              // 'button' | 'label' | 'entry' | ...
  name: string;                  // Python variable name (PEP8 valid)
  x: number;                     // pixels, absolute position
  y: number;
  width: number;
  height: number;
  parentId: string | null;       // null = canvas root, else container widget id
  properties: Record<string, WidgetPropertyValue>;
  bindings: WidgetBinding[];     // state variable bindings
  events: WidgetEvent[];         // command/event handlers
  style: WidgetStyle;
  metadata: {
    createdAt: number;
    updatedAt: number;
    notes?: string;
  };
}

export type WidgetType = 
  | 'button' | 'label' | 'entry' | 'text' | 'checkbutton' 
  | 'radiobutton' | 'listbox' | 'combobox' | 'scale' | 'spinbox'
  | 'frame' | 'labelframe' | 'notebook' | 'panedwindow'
  | 'canvas' | 'message' | 'scrollbar'
  // Lab-specific widgets
  | 'gauge' | 'chart' | 'led' | 'numeric_display' | 'log_viewer';

export type PropertyValue = 
  | string 
  | number 
  | boolean 
  | string[] 
  | { from: string; to: string };  // for scale ranges

export interface WidgetBinding {
  property: string;              // which widget property is bound
  stateVarId: string;            // reference to StateVariable.id
  transform?: string;            // optional: lambda expression for value transform
}

export interface WidgetEvent {
  trigger: 'click' | 'change' | 'submit' | 'dblclick' | 'hover' | 'timer';
  handler: string;               // Python code snippet or command reference
  async: boolean;                // whether to run in background thread
}

export interface WidgetStyle {
  bgColor?: string;              // hex color
  fgColor?: string;
  fontFamily?: string;
  fontSize?: number;
  borderWidth?: number;
  borderColor?: string;
  relief?: 'flat' | 'raised' | 'sunken' | 'groove' | 'ridge';
  padx?: number;
  pady?: number;
}

export interface StateVariable {
  id: string;                    // nanoid()
  name: string;                  // Python variable name
  type: 'string' | 'int' | 'float' | 'bool' | 'list' | 'dict' | 'object';
  initialValue: unknown;
  scope: 'global' | 'local' | 'instrument';
  persistence: 'none' | 'session' | 'disk';  // auto-save behavior
  instrumentId?: string;         // if sourced from instrument
  description?: string;
}

export interface InstrumentConfig {
  id: string;
  name: string;
  type: 'gpib' | 'visa' | 'serial' | 'tcp' | 'modbus' | 'simulated';
  connectionString: string;      // e.g., "GPIB0::22::INSTR" or "COM3"
  parameters: Record<string, string | number>;
  commands: InstrumentCommand[];
  pollingInterval: number;       // ms, 0 = on-demand only
  isConnected: boolean;          // runtime state (not persisted)
}

export interface InstrumentCommand {
  id: string;
  name: string;
  scpi: string;                  // SCPI command string
  responseType: 'string' | 'float' | 'int' | 'bool' | 'binary';
  parameters: CommandParameter[];
}

export interface CommandParameter {
  name: string;
  type: 'string' | 'float' | 'int' | 'enum';
  defaultValue?: unknown;
  options?: string[];            // for enum type
}

export interface DataLogger {
  id: string;
  name: string;
  sourceVarId: string;           // state variable to log
  interval: number;              // ms
  maxPoints: number;             // ring buffer size
  filePath?: string;             // optional disk log
  format: 'csv' | 'json';
}

export interface AlarmConfig {
  id: string;
  name: string;
  stateVarId: string;
  condition: 'gt' | 'lt' | 'eq' | 'range' | 'change';
  threshold: number | [number, number];
  severity: 'info' | 'warning' | 'critical';
  message: string;
  autoAck: boolean;
}

export interface ProjectMetadata {
  name: string;
  description: string;
  version: string;               // semver of the project file format
  appVersion: string;            // LabGUI Builder version that created it
  createdAt: number;             // epoch ms
  modifiedAt: number;
  author: string;
  tkinterVersion: '3.10' | '3.11' | '3.12';
  targetPlatform: 'windows' | 'linux' | 'macos' | 'cross';
}

// ── Project IR — Root Document ─────────────────────────────────

export interface ProjectIR {
  metadata: ProjectMetadata;
  widgets: WidgetIR[];           // flat list; parentId establishes hierarchy
  stateVariables: StateVariable[];
  instruments: InstrumentConfig[];
  dataLoggers: DataLogger[];
  alarms: AlarmConfig[];
  settings: ProjectSettings;
}

export interface ProjectSettings {
  windowWidth: number;           // default: 800
  windowHeight: number;          // default: 600
  windowTitle: string;
  theme: 'clam' | 'alt' | 'default' | 'classic';
  geometryManagement: 'place' | 'pack' | 'mixed';
  importStatements: string[];    // extra Python imports
  customCode: {
    preamble: string;            // code before GUI setup
    postamble: string;           // code after GUI setup
  };
}

// ── History System ─────────────────────────────────────────────

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;           // human-readable, e.g., "Moved Button_3 to (120, 200)"
  inversePatches: Patch[];       // Immer patches to undo this operation
  patches: Patch[];              // Immer patches to redo this operation
}

// ── Project Store State & Actions ──────────────────────────────

export interface ProjectStoreState {
  // Core IR
  project: ProjectIR;
  
  // History
  history: HistoryEntry[];
  historyIndex: number;          // -1 = nothing undone, points to current
  maxHistoryDepth: number;       // default: 200
  
  // Computed (derived, not persisted)
  getWidgetById: (id: string) => WidgetIR | undefined;
  getChildWidgets: (parentId: string | null) => WidgetIR[];
  getSelectedWidgets: () => WidgetIR[];
}

export interface ProjectStoreActions {
  // CRUD
  addWidget: (widget: Omit<WidgetIR, 'id' | 'metadata'>, parentId?: string | null) => string;
  updateWidget: (id: string, updates: Partial<WidgetIR>) => void;
  deleteWidget: (id: string) => void;
  moveWidget: (id: string, x: number, y: number) => void;
  resizeWidget: (id: string, width: number, height: number) => void;
  reparentWidget: (id: string, newParentId: string | null) => void;
  reorderWidget: (id: string, newIndex: number) => void;
  
  // Multi-select operations
  deleteSelected: (selectedIds: string[]) => void;
  duplicateSelected: (selectedIds: string[]) => string[];
  alignWidgets: (selectedIds: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeWidgets: (selectedIds: string[], axis: 'x' | 'y') => void;
  
  // State Variables
  addStateVar: (variable: Omit<StateVariable, 'id'>) => string;
  updateStateVar: (id: string, updates: Partial<StateVariable>) => void;
  deleteStateVar: (id: string) => void;
  
  // Instruments
  addInstrument: (instrument: Omit<InstrumentConfig, 'id'>) => string;
  updateInstrument: (id: string, updates: Partial<InstrumentConfig>) => void;
  deleteInstrument: (id: string) => void;
  
  // Data Loggers
  addDataLogger: (logger: Omit<DataLogger, 'id'>) => string;
  updateDataLogger: (id: string, updates: Partial<DataLogger>) => void;
  deleteDataLogger: (id: string) => void;
  
  // Alarms
  addAlarm: (alarm: Omit<AlarmConfig, 'id'>) => string;
  updateAlarm: (id: string, updates: Partial<AlarmConfig>) => void;
  deleteAlarm: (id: string) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  
  // Project lifecycle
  newProject: (template?: string) => void;
  loadProject: (project: ProjectIR) => void;
  setProjectName: (name: string) => void;
  updateSettings: (settings: Partial<ProjectSettings>) => void;
  
  // Serialization
  toJSON: () => string;
  fromJSON: (json: string) => void;
}

export type ProjectStore = ProjectStoreState & ProjectStoreActions;

// ── Store Factory ──────────────────────────────────────────────

export const useProjectStore = create<ProjectStore>()(
  devtools(
    immer((set, get) => ({
      // ... implementation in store/projectStore.ts
    })),
    { name: 'ProjectStore' }
  )
);
```

#### 2.2.3 UI Store — Complete State Shape

```typescript
// src/store/uiStore.ts

export type PanelTab = 'widgets' | 'templates' | 'properties' | 'layers' | 'state' | 'instruments';
export type BottomPanelTab = 'code' | 'events';
export type DialogType = 'export' | 'newProject' | 'instrumentConfig' | 'stateVarEditor' | 'alarmConfig' | 'templateSave' | null;

export interface UIStoreState {
  // Selection
  selectedWidgetIds: string[];           // empty = none, 1 = single, 2+ = multi
  hoveredWidgetId: string | null;
  
  // Canvas view
  zoom: number;                          // 0.25 to 4.0, default: 1.0
  panOffset: { x: number; y: number };   // pixels, default: {0, 0}
  snapToGrid: boolean;
  gridSize: number;                      // default: 10
  showGrid: boolean;
  wireframeMode: boolean;                // true = wireframe, false = styled preview
  
  // Panel visibility
  leftSidebarOpen: boolean;
  leftSidebarTab: 'widgets' | 'templates';
  rightSidebarOpen: boolean;
  rightSidebarTab: 'properties' | 'layers' | 'state' | 'instruments';
  bottomPanelOpen: boolean;
  bottomPanelTab: BottomPanelTab;
  bottomPanelHeight: number;             // pixels, default: 200
  
  // Drag state
  isDragging: boolean;
  dragSource: 'palette' | 'canvas' | 'tree' | 'resize' | null;
  dragPayload: unknown | null;
  dragPreviewPosition: { x: number; y: number } | null;
  
  // Clipboard
  clipboardWidgets: WidgetIR[] | null;   // copied widget data (deep clone)
  
  // Dialog
  activeDialog: DialogType;
  dialogPayload: unknown | null;
  
  // Theme
  theme: 'light' | 'dark';
  
  // Keyboard modifiers (live)
  modifiers: {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    space: boolean;
  };
}

export interface UIStoreActions {
  // Selection
  selectWidget: (id: string, additive?: boolean) => void;
  selectWidgets: (ids: string[]) => void;
  deselectAll: () => void;
  setHoveredWidget: (id: string | null) => void;
  
  // Canvas view
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setPanOffset: (offset: { x: number; y: number }) => void;
  panBy: (delta: { x: number; y: number }) => void;
  setSnapToGrid: (enabled: boolean) => void;
  setGridSize: (size: number) => void;
  setShowGrid: (show: boolean) => void;
  toggleWireframeMode: () => void;
  
  // Panels
  toggleLeftSidebar: () => void;
  setLeftSidebarTab: (tab: 'widgets' | 'templates') => void;
  toggleRightSidebar: () => void;
  setRightSidebarTab: (tab: 'properties' | 'layers' | 'state' | 'instruments') => void;
  toggleBottomPanel: () => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;
  setBottomPanelHeight: (height: number) => void;
  
  // Drag
  startDrag: (source: 'palette' | 'canvas' | 'tree' | 'resize', payload: unknown) => void;
  updateDragPosition: (position: { x: number; y: number }) => void;
  endDrag: () => void;
  
  // Clipboard
  copyWidgets: (widgets: WidgetIR[]) => void;
  clearClipboard: () => void;
  
  // Dialog
  openDialog: (dialog: DialogType, payload?: unknown) => void;
  closeDialog: () => void;
  
  // Theme
  setTheme: (theme: 'light' | 'dark') => void;
  toggleTheme: () => void;
  
  // Modifiers
  setModifier: (key: 'ctrl' | 'shift' | 'alt' | 'space', pressed: boolean) => void;
}

export type UIStore = UIStoreState & UIStoreActions;

export const useUIStore = create<UIStore>()(
  devtools(
    immer((set, get) => ({
      // ... implementation in store/uiStore.ts
    })),
    { name: 'UIStore' }
  )
);
```

#### 2.2.4 Action Flow Pattern

```
User Action
    │
    ├──→ Direct UI update (optimistic) ──→ UI Store ──→ Component re-render
    │
    ├──→ IR mutation ──→ Project Store (Immer produces patches)
    │       │
    │       └──→ History system captures inverse patches
    │       │
    │       └──→ Code generator triggered (debounced 300ms)
    │       │       └──→ IR → TkinterGenerator → Python string
    │       │               └──→ CodePanel re-render (Monaco setValue)
    │       │
    │       └──→ Auto-save triggered (debounced 2000ms)
    │               └──→ JSON.stringify → localStorage
    │
    └──→ Side effects (clipboard, file download, etc.)
```

#### 2.2.5 Selector Pattern for Performance

```typescript
// Good: granular selector prevents re-render on unrelated changes
const selectedId = useUIStore(s => s.selectedWidgetIds[0]);
const widgetName = useProjectStore(
  useCallback(
    state => state.project.widgets.find(w => w.id === selectedId)?.name,
    [selectedId]
  )
);

// Good: derive computed values outside store
function useSelectedWidgets(): WidgetIR[] {
  const selectedIds = useUIStore(s => s.selectedWidgetIds);
  const widgets = useProjectStore(s => s.project.widgets);
  return useMemo(
    () => widgets.filter(w => selectedIds.includes(w.id)),
    [widgets, selectedIds]
  );
}
```

### 2.3 Module Boundaries

```
src/
├── main.tsx                          # Entry point: ReactDOM.createRoot
├── App.tsx                           # Root component, providers
├── index.css                         # Tailwind directives, CSS variables
│
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx             # 3-row CSS grid shell
│   │   ├── Header.tsx                # Toolbar with all controls
│   │   ├── Workspace.tsx             # 3-col flex: left/canvas/right
│   │   ├── BottomPanel.tsx           # Resizable bottom section
│   │   └── PanelResizer.tsx          # Drag-to-resize handle
│   │
│   ├── canvas/
│   │   ├── Canvas.tsx                # Main canvas container
│   │   ├── CanvasWidget.tsx          # Individual widget render (memoized)
│   │   ├── SelectionOverlay.tsx      # Canvas 2D: bounding boxes, handles
│   │   ├── GridOverlay.tsx           # Canvas 2D: grid lines, snap preview
│   │   ├── ZoomControls.tsx          # Zoom in/out/fit buttons
│   │   ├── PanOverlay.tsx            # Spacebar+drag panning
│   │   └── LassoOverlay.tsx          # Marquee/multi-select
│   │
│   ├── widgets/
│   │   ├── WidgetPalette.tsx         # Left sidebar widget list
│   │   ├── WidgetPaletteItem.tsx     # Draggable palette item
│   │   ├── WidgetCategory.tsx        # Collapsible category group
│   │   ├── WidgetIcon.tsx            # Widget type → Lucide icon mapping
│   │   └── renderers/                # Widget-specific canvas renderers
│   │       ├── ButtonRenderer.tsx
│   │       ├── EntryRenderer.tsx
│   │       ├── GaugeRenderer.tsx
│   │       └── ... (one per widget type)
│   │
│   ├── panels/
│   │   ├── PropertiesPanel.tsx       # Right sidebar: dynamic form
│   │   ├── PositionSection.tsx       # x, y, w, h inputs
│   │   ├── StyleSection.tsx          # Colors, fonts, borders
│   │   ├── BindingSection.tsx        # State var binding UI
│   │   ├── EventSection.tsx          # Event handler editor
│   │   ├── WidgetTreePanel.tsx       # Sortable widget tree
│   │   ├── TreeNode.tsx              # Individual tree item
│   │   ├── StateInspectorPanel.tsx   # State variable table
│   │   ├── InstrumentsPanel.tsx      # Instrument list + status
│   │   ├── CodePanel.tsx             # Monaco Editor wrapper
│   │   ├── EventLogPanel.tsx         # Action history log
│   │   └── common/                   # Panel building blocks
│   │       ├── FormField.tsx
│   │       ├── ColorPicker.tsx
│   │       ├── NumericInput.tsx
│   │       ├── BindingSelect.tsx
│   │       └── EventEditor.tsx
│   │
│   ├── dialogs/
│   │   ├── DialogShell.tsx           # Common modal wrapper (Radix Dialog)
│   │   ├── ExportDialog.tsx          # Python export options
│   │   ├── NewProjectDialog.tsx      # Template selection
│   │   ├── InstrumentConfigDialog.tsx
│   │   ├── StateVarEditorDialog.tsx
│   │   ├── AlarmConfigDialog.tsx
│   │   └── TemplateSaveDialog.tsx
│   │
│   └── common/
│       ├── IconButton.tsx            # Button with Lucide icon
│       ├── ToolbarButton.tsx         # Header toolbar button
│       ├── TabBar.tsx                # Panel tab switcher
│       ├── ScrollArea.tsx            # Custom scrollable container
│       ├── EmptyState.tsx            # "No selection" placeholder
│       ├── Tooltip.tsx               # Hover tooltip wrapper
│       ├── ContextMenu.tsx           # Right-click menu
│       └── ShortcutHint.tsx          # Keyboard shortcut display
│
├── store/
│   ├── projectStore.ts               # Project IR + CRUD actions
│   ├── uiStore.ts                    # UI state + view actions
│   ├── historyMiddleware.ts          # Immer patch capture for undo/redo
│   ├── autoSaveMiddleware.ts         # localStorage auto-save
│   └── selectors.ts                  # Shared memoized selectors
│
├── ir/
│   ├── types.ts                      # Core TypeScript interfaces
│   ├── widgetDefs.ts                 # Widget type definitions, defaults, schemas
│   ├── validators.ts                 # Zod schemas for runtime validation
│   ├── migrations.ts                 # Version migration functions
│   ├── factory.ts                    # Widget creation factory
│   └── naming.ts                     # Auto-naming (Button_1, Button_2, ...)
│
├── generators/
│   ├── tkinter/
│   │   ├── TkinterGenerator.ts       # Main generator visitor
│   │   ├── WidgetVisitors.ts         # Per-widget-type code emitters
│   │   ├── LayoutGenerator.ts        # place() geometry code
│   │   ├── StateVarGenerator.ts      # State variable declarations
│   │   ├── InstrumentGenerator.ts    # pyvisa/pyserial setup code
│   │   ├── BindingGenerator.ts       # Variable binding code
│   │   ├── EventGenerator.ts         # Event handler code
│   │   ├── Template.ts               # Code template wrapper
│   │   └── utils.ts                  # Indent helpers, name sanitizers
│   ├── CodeFormatter.ts              # Black-compatible formatting
│   └── generateCode.ts               # Entry point: IR → Python string
│
├── canvas/
│   ├── engine/
│   │   ├── CanvasEngine.ts           # Orchestrator: render loop
│   │   ├── DOMRenderer.ts            # Widget div creation/update
│   │   └── OverlayRenderer.ts        # Canvas 2D overlay rendering
│   ├── interaction/
│   │   ├── DragManager.ts            # @dnd-kit sensor configuration
│   │   ├── SelectManager.ts          # Click, lasso, multi-select
│   │   ├── ResizeManager.ts          # Handle drag for resize
│   │   └── PanManager.ts             # Spacebar panning
│   ├── math/
│   │   ├── coordinates.ts            # Screen ↔ canvas coordinate transforms
│   │   ├── snap.ts                   # Snap-to-grid algorithm
│   │   ├── hitTest.ts                # Point-in-rect, handle detection
│   │   └── lasso.ts                  # Lasso selection polygon test
│   └── clipboard.ts                  # Copy/paste serialization
│
├── hooks/
│   ├── useSelectedWidgets.ts         # Derived: get selected widget objects
│   ├── useWidgetTree.ts             # Derived: build tree structure from flat list
│   ├── useKeyboardShortcuts.ts      # Global keyboard shortcut handler
│   ├── useAutoSave.ts               # Auto-save effect hook
│   ├── useCodeGeneration.ts         # Debounced code generation
│   ├── useHistory.ts                # Undo/redo with keyboard shortcuts
│   ├── useClipboard.ts              # Copy/paste keyboard handlers
│   ├── useResizeObserver.ts         # Panel resize detection
│   ├── useFileHandling.ts           # File System Access API wrapper
│   ├── useTheme.ts                  # Dark/light mode
│   └── useDebounce.ts              # Generic debounce utility
│
├── utils/
│   ├── id.ts                         # nanoid wrapper
│   ├── naming.ts                     # PEP8 name validation/conversion
│   ├── color.ts                      # Color conversion (hex ↔ rgb)
│   ├── units.ts                      # Unit conversion (px ↔ character units)
│   ├── file.ts                       # File download helpers
│   ├── json.ts                       # Safe JSON parse/stringify
│   ├── validators.ts                 # Input validation helpers
│   └── formatters.ts               # Number format, string helpers
│
├── types/
│   ├── index.ts                      # Public type exports
│   ├── widgets.ts                    # Widget type union + discriminated unions
│   ├── events.ts                     # Event type definitions
│   └── api.ts                        # Internal API type contracts
│
├── constants/
│   ├── widgetCatalog.ts              # Full widget catalog: types, icons, defaults, categories
│   ├── defaultProject.ts             # New project template IR
│   ├── keyboardShortcuts.ts          # Shortcut keymap definition
│   ├── constraints.ts                # Min/max widget sizes, canvas bounds
│   └── themes.ts                     # Light/dark CSS variable definitions
│
└── workers/
    └── codeGenerator.worker.ts       # Web Worker for code generation
```

---

## 3. Canvas Rendering Engine

### 3.1 Rendering Approach: DOM + Canvas 2D Hybrid

The canvas uses a **three-layer compositing architecture**:

```
┌─────────────────────────────────────────────────┐
│  Layer 3: HTML5 Canvas 2D Overlay                │
│  - Selection bounding boxes (blue stroke)        │
│  - Resize handles (8 squares on corners/edges)   │
│  - Lasso/marquee rectangle                       │
│  - Snap-to-grid alignment guides                 │
│  - Drag ghost/preview outline                    │
│  (opacity: 1, pointer-events: none)              │
├─────────────────────────────────────────────────┤
│  Layer 2: Widget DOM Nodes                       │
│  - Absolutely-positioned div elements            │
│  - Wireframe border + label text                 │
│  - Widget-specific wireframe content             │
│  - CSS transform for zoom                        │
│  (pointer-events: auto for interaction)          │
├─────────────────────────────────────────────────┤
│  Layer 1: Grid Background (Canvas 2D)            │
│  - Dotted grid lines                             │
│  - Major/minor axis indicators                   │
│  - Canvas bounds rectangle                       │
│  (static, re-rendered on zoom/grid change only)  │
└─────────────────────────────────────────────────┘
```

#### Layer 1: Grid Background (Canvas 2D)

Rendered once per zoom/grid change. Cached as an offscreen canvas for performance.

```typescript
// src/canvas/engine/GridRenderer.ts

export function renderGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  gridSize: number,
  zoom: number,
  panOffset: { x: number; y: number },
  options: { showGrid: boolean; majorInterval?: number }
): void {
  if (!options.showGrid) return;
  
  const effectiveGridSize = gridSize * zoom;
  const startX = (panOffset.x % effectiveGridSize);
  const startY = (panOffset.y % effectiveGridSize);
  
  ctx.save();
  ctx.strokeStyle = 'rgba(150, 150, 150, 0.25)';
  ctx.lineWidth = 0.5;
  
  // Vertical lines
  for (let x = startX; x < width; x += effectiveGridSize) {
    const isMajor = Math.round((x - panOffset.x) / effectiveGridSize) % (options.majorInterval || 5) === 0;
    ctx.globalAlpha = isMajor ? 0.4 : 0.2;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  
  // Horizontal lines
  for (let y = startY; y < height; y += effectiveGridSize) {
    const isMajor = Math.round((y - panOffset.y) / effectiveGridSize) % (options.majorInterval || 5) === 0;
    ctx.globalAlpha = isMajor ? 0.4 : 0.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  
  ctx.restore();
}
```

#### Layer 2: Widget DOM Nodes

Each widget is an absolutely-positioned `div` with wireframe styling:

```typescript
// src/components/canvas/CanvasWidget.tsx

import React, { memo, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { widgetRenderers } from '@/components/widgets/renderers';

interface CanvasWidgetProps {
  widgetId: string;
}

export const CanvasWidget = memo(function CanvasWidget({ widgetId }: CanvasWidgetProps) {
  const widget = useProjectStore(
    useCallback(state => 
      state.project.widgets.find(w => w.id === widgetId),
      [widgetId]
    )
  );
  const selectedIds = useUIStore(s => s.selectedWidgetIds);
  const isSelected = selectedIds.includes(widgetId);
  const isMultiSelected = selectedIds.length > 1 && isSelected;
  const zoom = useUIStore(s => s.zoom);
  
  if (!widget) return null;
  
  const Renderer = widgetRenderers[widget.type];
  
  return (
    <div
      className={`
        absolute select-none
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-0' : ''}
        ${isMultiSelected ? 'ring-blue-400' : ''}
        hover:ring-1 hover:ring-blue-300
      `}
      style={{
        left: widget.x * zoom,
        top: widget.y * zoom,
        width: widget.width * zoom,
        height: widget.height * zoom,
        border: '1px solid #64748b',
        backgroundColor: 'rgba(241, 245, 249, 0.5)',
      }}
      data-widget-id={widgetId}
    >
      <Renderer widget={widget} zoom={zoom} wireframe />
    </div>
  );
});
```

Wireframe rendering per widget type (example button):

```typescript
// src/components/widgets/renderers/ButtonRenderer.tsx

export function ButtonRenderer({ widget, zoom, wireframe }: WidgetRendererProps) {
  const text = (widget.properties.text as string) || widget.name;
  const fontSize = Math.max(8, (widget.style.fontSize || 12) * zoom);
  
  if (wireframe) {
    return (
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <span 
          className="text-slate-500 truncate px-1"
          style={{ fontSize: `${fontSize}px` }}
        >
          [{text}]
        </span>
      </div>
    );
  }
  
  // Styled preview mode (Phase 2)
  return <button className="w-full h-full">{text}</button>;
}
```

#### Layer 3: Selection Overlay (Canvas 2D)

Rendered on every frame during interaction. Handles:
- Selection bounding boxes
- Resize handle rendering and hit detection
- Lasso/marquee selection
- Snap-to-grid alignment guides

```typescript
// src/canvas/engine/OverlayRenderer.ts

export interface SelectionRenderOptions {
  selectedWidgets: Array<{ x: number; y: number; width: number; height: number }>;
  zoom: number;
  panOffset: { x: number; y: number };
  activeHandle?: ResizeHandle | null;
  lassoRect?: { x: number; y: number; width: number; height: } | null;
  snapGuides?: SnapGuide[];
}

export function renderSelectionOverlay(
  ctx: CanvasRenderingContext2D,
  options: SelectionRenderOptions
): void {
  ctx.save();
  ctx.setTransform(options.zoom, 0, 0, options.zoom, options.panOffset.x, options.panOffset.y);
  
  // Draw bounding boxes for selected widgets
  for (const rect of options.selectedWidgets) {
    ctx.strokeStyle = '#3b82f6'; // blue-500
    ctx.lineWidth = 1 / options.zoom;
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    
    // Draw resize handles (8 handles: 4 corners + 4 edges)
    drawResizeHandles(ctx, rect, options.zoom, options.activeHandle);
  }
  
  // Draw lasso rectangle
  if (options.lassoRect) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    ctx.strokeStyle = '#3b82f6';
    ctx.setLineDash([4 / options.zoom, 4 / options.zoom]);
    ctx.fillRect(
      options.lassoRect.x, 
      options.lassoRect.y, 
      options.lassoRect.width, 
      options.lassoRect.height
    );
    ctx.strokeRect(
      options.lassoRect.x, 
      options.lassoRect.y, 
      options.lassoRect.width, 
      options.lassoRect.height
    );
    ctx.setLineDash([]);
  }
  
  // Draw snap guides
  if (options.snapGuides) {
    ctx.strokeStyle = '#10b981'; // emerald-500
    ctx.lineWidth = 0.5 / options.zoom;
    for (const guide of options.snapGuides) {
      ctx.beginPath();
      ctx.moveTo(guide.x1, guide.y1);
      ctx.lineTo(guide.x2, guide.y2);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  rect: { x: number; y: number; width: number; height: number },
  zoom: number,
  activeHandle?: ResizeHandle | null
): void {
  const HANDLE_SIZE = 6 / zoom;
  const positions = [
    { x: rect.x, y: rect.y, handle: 'nw' as ResizeHandle },
    { x: rect.x + rect.width / 2, y: rect.y, handle: 'n' as ResizeHandle },
    { x: rect.x + rect.width, y: rect.y, handle: 'ne' as ResizeHandle },
    { x: rect.x + rect.width, y: rect.y + rect.height / 2, handle: 'e' as ResizeHandle },
    { x: rect.x + rect.width, y: rect.y + rect.height, handle: 'se' as ResizeHandle },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height, handle: 's' as ResizeHandle },
    { x: rect.x, y: rect.y + rect.height, handle: 'sw' as ResizeHandle },
    { x: rect.x, y: rect.y + rect.height / 2, handle: 'w' as ResizeHandle },
  ];
  
  for (const pos of positions) {
    ctx.fillStyle = pos.handle === activeHandle ? '#2563eb' : '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 0.5 / zoom;
    ctx.fillRect(
      pos.x - HANDLE_SIZE / 2,
      pos.y - HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE
    );
    ctx.strokeRect(
      pos.x - HANDLE_SIZE / 2,
      pos.y - HANDLE_SIZE / 2,
      HANDLE_SIZE,
      HANDLE_SIZE
    );
  }
}
```

### 3.2 Coordinate System

#### 3.2.1 Coordinate Spaces

```typescript
// src/canvas/math/coordinates.ts

/**
 * Three coordinate spaces:
 * 
 * 1. SCREEN SPACE: Pixels relative to the CanvasArea viewport
 *    - Mouse events report in this space
 *    - Used for: hit testing against viewport, scroll handling
 * 
 * 2. CANVAS SPACE: Pixels in the design canvas (96 DPI)
 *    - Widget positions (x, y, w, h) stored in this space
 *    - Used for: widget positioning, grid alignment, IR storage
 *    - Origin: top-left of canvas
 * 
 * 3. ZOOMED SPACE: Canvas space × zoom + panOffset
 *    - Used for: DOM positioning, rendering
 *    - Transform: screen → canvas_space = (screen - panOffset) / zoom
 */

export interface Point {
  x: number;
  y: number;
}

// Screen space → Canvas space (undo zoom + pan)
export function screenToCanvas(screenPoint: Point, zoom: number, panOffset: Point): Point {
  return {
    x: (screenPoint.x - panOffset.x) / zoom,
    y: (screenPoint.y - panOffset.y) / zoom,
  };
}

// Canvas space → Screen space (apply zoom + pan)
export function canvasToScreen(canvasPoint: Point, zoom: number, panOffset: Point): Point {
  return {
    x: canvasPoint.x * zoom + panOffset.x,
    y: canvasPoint.y * zoom + panOffset.y,
  };
}

// Widget rectangle in canvas space
export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Convert widget rect to screen pixels for DOM positioning
export function widgetRectToScreen(rect: CanvasRect, zoom: number, panOffset: Point): CanvasRect {
  return {
    x: rect.x * zoom + panOffset.x,
    y: rect.y * zoom + panOffset.y,
    width: rect.width * zoom,
    height: rect.height * zoom,
  };
}
```

#### 3.2.2 Snap-to-Grid Algorithm

```typescript
// src/canvas/math/snap.ts

export interface SnapResult {
  x: number;
  y: number;
  snappedX: boolean;   // Was x snapped?
  snappedY: boolean;   // Was y snapped?
  guides: SnapGuide[]; // Visual guides to render
}

export interface SnapGuide {
  x1: number; y1: number;
  x2: number; y2: number;
  axis: 'x' | 'y';
}

/**
 * Snap a position to the nearest grid point.
 * Also provides visual snap guides for the overlay renderer.
 */
export function snapToGrid(
  position: Point,
  gridSize: number,
  zoom: number
): SnapResult {
  const snappedX = Math.round(position.x / gridSize) * gridSize;
  const snappedY = Math.round(position.y / gridSize) * gridSize;
  
  const guides: SnapGuide[] = [];
  
  if (snappedX !== position.x) {
    guides.push({
      x1: snappedX, y1: snappedX,  // full horizontal guide
      x2: snappedX, y2: snappedX,
      axis: 'x',
    });
  }
  
  if (snappedY !== position.y) {
    guides.push({
      x1: snappedY, y1: snappedY,
      x2: snappedY, y2: snappedY,
      axis: 'y',
    });
  }
  
  return {
    x: snappedX,
    y: snappedY,
    snappedX: snappedX !== position.x,
    snappedY: snappedY !== position.y,
    guides,
  };
}

/**
 * Snap widget edges to nearby widget edges (smart guides).
 * Returns the snapped position and alignment guides.
 */
export function snapToWidgets(
  rect: CanvasRect,
  otherWidgets: CanvasRect[],
  threshold: number = 8
): { rect: CanvasRect; guides: SnapGuide[] } {
  let dx = 0, dy = 0;
  const guides: SnapGuide[] = [];
  
  const edges = [
    { value: rect.x, type: 'left' as const },
    { value: rect.x + rect.width, type: 'right' as const },
    { value: rect.x + rect.width / 2, type: 'centerX' as const },
  ];
  
  for (const edge of edges) {
    for (const other of otherWidgets) {
      const otherEdges = [
        other.x, other.x + other.width, other.x + other.width / 2,
        other.x + other.width  // right edge
      ];
      for (const otherEdge of otherEdges) {
        if (Math.abs(edge.value - otherEdge) < threshold) {
          dx = otherEdge - edge.value;
          guides.push({
            x1: otherEdge, y1: Math.min(rect.y, other.y) - 20,
            x2: otherEdge, y2: Math.max(rect.y + rect.height, other.y + other.height) + 20,
            axis: 'x',
          });
        }
      }
    }
  }
  
  return {
    rect: { ...rect, x: rect.x + dx, y: rect.y + dy },
    guides,
  };
}
```

#### 3.2.3 Hit Testing

```typescript
// src/canvas/math/hitTest.ts

export type HitRegion = 
  | { type: 'widget'; widgetId: string }
  | { type: 'resizeHandle'; widgetId: string; handle: ResizeHandle }
  | { type: 'canvas'; position: Point }
  | { type: 'none' };

export type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

const HANDLE_SIZE = 6;  // pixels (screen space)
const EDGE_TOLERANCE = 4; // pixels for "near edge" detection

/**
 * Test if a screen-space point hits any interactive element.
 */
export function hitTest(
  screenPoint: Point,
  widgets: Array<{ id: string; x: number; y: number; width: number; height: number }>,
  zoom: number,
  panOffset: Point
): HitRegion {
  const canvasPoint = screenToCanvas(screenPoint, zoom, panOffset);
  
  // Test resize handles first (highest priority)
  for (const widget of widgets) {
    const handle = testResizeHandle(canvasPoint, widget);
    if (handle) {
      return { type: 'resizeHandle', widgetId: widget.id, handle };
    }
  }
  
  // Test widget bodies (reverse z-order: topmost first)
  for (let i = widgets.length - 1; i >= 0; i--) {
    const widget = widgets[i];
    if (
      canvasPoint.x >= widget.x &&
      canvasPoint.x <= widget.x + widget.width &&
      canvasPoint.y >= widget.y &&
      canvasPoint.y <= widget.y + widget.height
    ) {
      return { type: 'widget', widgetId: widget.id };
    }
  }
  
  return { type: 'canvas', position: canvasPoint };
}

function testResizeHandle(
  point: Point,
  rect: { x: number; y: number; width: number; height: number },
  tolerance: number = 6
): ResizeHandle | null {
  const { x, y, width, height } = rect;
  const right = x + width;
  const bottom = y + height;
  const midX = x + width / 2;
  const midY = y + height / 2;
  
  // Corner handles (priority over edge)
  if (near(point, x, y, tolerance)) return 'nw';
  if (near(point, right, y, tolerance)) return 'ne';
  if (near(point, right, bottom, tolerance)) return 'se';
  if (near(point, x, bottom, tolerance)) return 'sw';
  
  // Edge handles
  if (Math.abs(point.x - midX) < tolerance && Math.abs(point.y - y) < tolerance) return 'n';
  if (Math.abs(point.x - right) < tolerance && Math.abs(point.y - midY) < tolerance) return 'e';
  if (Math.abs(point.x - midX) < tolerance && Math.abs(point.y - bottom) < tolerance) return 's';
  if (Math.abs(point.x - x) < tolerance && Math.abs(point.y - midY) < tolerance) return 'w';
  
  return null;
}

function near(p: Point, x: number, y: number, tolerance: number): boolean {
  return Math.abs(p.x - x) < tolerance && Math.abs(p.y - y) < tolerance;
}
```

### 3.3 Drag and Drop Architecture

#### 3.3.1 DnD Context Configuration

```typescript
// src/canvas/interaction/DragManager.ts

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import { restrictToWindowEdges } from '@dnd-kit/modifiers';

// Custom sensor: require 3px movement before drag starts
// (prevents accidental drags on click)
const pointerSensor = useSensor(PointerSensor, {
  activationConstraint: {
    distance: 3,
  },
});

const sensors = useSensors(pointerSensor);

// DnD context wraps the entire app
<DndContext
  sensors={sensors}
  onDragStart={handleDragStart}
  onDragMove={handleDragMove}
  onDragEnd={handleDragEnd}
  modifiers={[restrictToWindowEdges]}
>
  <AppLayout />
  <DragOverlay>
    {activeDrag ? <DragPreview item={activeDrag} /> : null}
  </DragOverlay>
</DndContext>
```

#### 3.3.2 Five Drag Interaction Types

```typescript
// src/canvas/interaction/dragHandlers.ts

export type DragOperation =
  | { type: 'paletteToCanvas'; widgetType: WidgetType; initialPosition: Point }
  | { type: 'canvasMove'; widgetIds: string[]; startPositions: Point[] }
  | { type: 'canvasResize'; widgetId: string; handle: ResizeHandle; startRect: CanvasRect }
  | { type: 'treeReorder'; widgetId: string; sourceIndex: number }
  | { type: 'gridAssign'; widgetId: string; cell: { row: number; col: number } };

/**
 * Handle drag from palette: create new widget at drop position.
 */
export function handlePaletteDrop(
  widgetType: WidgetType,
  dropPosition: Point,
  projectStore: ProjectStore
): string {
  const defaults = getWidgetDefaults(widgetType);
  const snapped = snapToGrid(dropPosition, GRID_SIZE, 1);
  
  return projectStore.addWidget({
    type: widgetType,
    name: projectStore.generateUniqueName(widgetType),
    x: snapped.x,
    y: snapped.y,
    width: defaults.width,
    height: defaults.height,
    parentId: null,
    properties: defaults.properties,
    bindings: [],
    events: [],
    style: defaults.style,
  });
}

/**
 * Handle canvas move: update positions of all selected widgets.
 */
export function handleCanvasMove(
  widgetIds: string[],
  startPositions: Point[],
  delta: Point,
  snapToGrid: boolean,
  gridSize: number,
  projectStore: ProjectStore
): void {
  const snappedDelta = snapToGrid 
    ? { 
        x: Math.round(delta.x / gridSize) * gridSize,
        y: Math.round(delta.y / gridSize) * gridSize,
      }
    : delta;
  
  for (let i = 0; i < widgetIds.length; i++) {
    const newPos = {
      x: startPositions[i].x + snappedDelta.x,
      y: startPositions[i].y + snappedDelta.y,
    };
    projectStore.moveWidget(widgetIds[i], newPos.x, newPos.y);
  }
}

/**
 * Handle resize via drag handle: update widget dimensions.
 */
export function handleCanvasResize(
  widgetId: string,
  handle: ResizeHandle,
  startRect: CanvasRect,
  delta: Point,
  keepAspectRatio: boolean,
  snapToGrid: boolean,
  gridSize: number,
  projectStore: ProjectStore,
  constraints: { minWidth: number; minHeight: number }
): void {
  let { x, y, width, height } = startRect;
  
  // Apply delta based on which handle is dragged
  switch (handle) {
    case 'e':  width += delta.x; break;
    case 'w':  x += delta.x; width -= delta.x; break;
    case 's':  height += delta.y; break;
    case 'n':  y += delta.y; height -= delta.y; break;
    case 'se': width += delta.x; height += delta.y; break;
    case 'sw': x += delta.x; width -= delta.x; height += delta.y; break;
    case 'ne': width += delta.x; y += delta.y; height -= delta.y; break;
    case 'nw': x += delta.x; width -= delta.x; y += delta.y; height -= delta.y; break;
  }
  
  // Enforce minimums
  width = Math.max(width, constraints.minWidth);
  height = Math.max(height, constraints.minHeight);
  
  // Snap
  if (snapToGrid) {
    x = Math.round(x / gridSize) * gridSize;
    y = Math.round(y / gridSize) * gridSize;
    width = Math.round(width / gridSize) * gridSize;
    height = Math.round(height / gridSize) * gridSize;
  }
  
  projectStore.updateWidget(widgetId, { x, y, width, height });
}

/**
 * Handle tree reorder: reparent or reorder widget in tree.
 */
export function handleTreeReorder(
  widgetId: string,
  newParentId: string | null,
  newIndex: number,
  projectStore: ProjectStore
): void {
  projectStore.reparentWidget(widgetId, newParentId);
  projectStore.reorderWidget(widgetId, newIndex);
}
```

#### 3.3.3 Z-Index / Layer Ordering

```typescript
// src/ir/layering.ts

/**
 * Widgets are rendered in DOM order (array order = paint order).
 * The `project.widgets` array IS the z-order.
 * 
 * - New widgets are appended (topmost)
 * - "Bring to Front" → move to end of array
 * - "Send to Back" → move to beginning of array
 * - "Bring Forward" → swap with next widget
 * - "Send Backward" → swap with previous widget
 * 
 * Container widgets (Frame, LabelFrame, Notebook, PanedWindow)
 * render their children on top of themselves regardless of
 * global array position.
 */

export function bringToFront(widgets: WidgetIR[], widgetId: string): WidgetIR[] {
  const index = widgets.findIndex(w => w.id === widgetId);
  if (index === -1 || index === widgets.length - 1) return widgets;
  const [widget] = widgets.splice(index, 1);
  return [...widgets, widget];
}

export function sendToBack(widgets: WidgetIR[], widgetId: string): WidgetIR[] {
  const index = widgets.findIndex(w => w.id === widgetId);
  if (index <= 0) return widgets;
  const [widget] = widgets.splice(index, 1);
  return [widget, ...widgets];
}
```

---

## 4. Data Flow Architecture

### 4.1 CRUD Operations on IR

#### 4.1.1 Add Widget Flow

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
│ createWidget()     │  Generate unique PEP8 name (Button_1, ...)
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
    │         (debounced)
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

#### 4.1.2 Move Widget Flow

```typescript
// src/store/projectStore.ts — moveWidget implementation

moveWidget: (id, x, y) =>
  set(
    produce((draft: ProjectStoreState) => {
      const widget = draft.project.widgets.find(w => w.id === id);
      if (!widget) return;
      
      const prevX = widget.x;
      const prevY = widget.y;
      widget.x = Math.max(0, x);
      widget.y = Math.max(0, y);
      widget.metadata.updatedAt = Date.now();
      
      // Auto-update parent bounds if this is a container
      // (children stay relative; container grows if needed)
    }),
    false,
    'project/moveWidget'  // Redux DevTools action label
  ),
```

#### 4.1.3 Edit Property Flow

```
User types in Properties Panel input
         │
         ▼
┌────────────────────┐
│ onChange handler   │  Debounced 100ms for text inputs
│ (instant for       │  Instant for dropdowns/checkboxes
│  numeric with      │
│  Enter key)        │
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

#### 4.1.4 Delete Widget Flow

```typescript
// src/store/projectStore.ts — delete with cascade

deleteWidget: (id) =>
  set(
    produce((draft: ProjectStoreState) => {
      // Collect all descendant widgets (recursive)
      const idsToDelete = new Set<string>();
      const collectDescendants = (parentId: string) => {
        idsToDelete.add(parentId);
        draft.project.widgets
          .filter(w => w.parentId === parentId)
          .forEach(child => collectDescendants(child.id));
      };
      collectDescendants(id);
      
      // Remove from widgets array
      draft.project.widgets = draft.project.widgets.filter(
        w => !idsToDelete.has(w.id)
      );
      
      // Clean up dangling bindings
      const deletedVarIds = new Set(
        draft.project.stateVariables
          .filter(sv => sv.scope === 'local' && Array.from(idsToDelete).includes(sv.id))
          .map(sv => sv.id)
      );
      draft.project.stateVariables = draft.project.stateVariables.filter(
        sv => !deletedVarIds.has(sv.id)
      );
      
      // Clean up dangling references in remaining widgets
      for (const widget of draft.project.widgets) {
        widget.bindings = widget.bindings.filter(
          b => !deletedVarIds.has(b.stateVarId)
        );
      }
      
      draft.project.metadata.modifiedAt = Date.now();
    }),
    false,
    'project/deleteWidget'
  ),
```

#### 4.1.5 Undo/Redo Flow

```typescript
// src/store/historyMiddleware.ts

import { enablePatches, produceWithPatches, applyPatches } from 'immer';
enablePatches();

export interface HistoryConfig {
  maxDepth: number;       // default: 200
  debounceMs: number;     // default: 500 (merge rapid ops)
}

/**
 * Wraps a Zustand store action to capture Immer patches
 * for undo/redo support.
 */
export function withHistory<T extends Record<string, any>>(
  config: HistoryConfig
): StoreMiddleware<T> {
  return (config, set, get, api) => {
    const history: HistoryEntry[] = [];
    let index = -1;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingEntry: HistoryEntry | null = null;
    
    return {
      undo: () => {
        if (index < 0) return;
        const entry = history[index];
        set(
          produce((draft: T) => {
            applyPatches(draft, entry.inversePatches);
          })
        );
        index--;
      },
      
      redo: () => {
        if (index >= history.length - 1) return;
        index++;
        const entry = history[index];
        set(
          produce((draft: T) => {
            applyPatches(draft, entry.patches);
          })
        );
      },
      
      canUndo: () => index >= 0,
      canRedo: () => index < history.length - 1,
      
      _recordPatches: (patches: Patch[], inversePatches: Patch[], description: string) => {
        // Debounce: merge with pending entry if same action type
        if (pendingEntry && pendingEntry.description === description) {
          pendingEntry.patches.push(...patches);
          pendingEntry.inversePatches.unshift(...inversePatches);
          if (debounceTimer) clearTimeout(debounceTimer);
        } else {
          // Flush pending entry
          if (pendingEntry) {
            history[++index] = pendingEntry;
            // Trim if over max depth
            if (history.length > config.maxDepth) {
              history.shift();
              index--;
            }
          }
          
          pendingEntry = {
            id: nanoid(),
            timestamp: Date.now(),
            description,
            patches,
            inversePatches,
          };
        }
        
        debounceTimer = setTimeout(() => {
          if (pendingEntry) {
            history[++index] = pendingEntry;
            pendingEntry = null;
          }
        }, config.debounceMs);
      },
    };
  };
}
```

### 4.2 Code Generation Pipeline

#### 4.2.1 Pipeline Architecture

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
│   Output    │    Line length ≤ 88 characters
└──────┬──────┘
       │
       ▼
┌─────────────┐    Post back to main thread
│  Monaco     │    editor.setValue(pythonCode)
│  setValue() │    Preserve scroll position if unchanged
└─────────────┘
```

#### 4.2.2 Generator Implementation

```typescript
// src/generators/tkinter/TkinterGenerator.ts

export class TkinterGenerator {
  private output: CodeBuilder;
  private project: ProjectIR;
  private indentLevel: number = 0;
  
  constructor(project: ProjectIR) {
    this.project = project;
    this.output = new CodeBuilder();
  }
  
  generate(): string {
    this.emitImports();
    this.emitPreamble();
    this.emitClassDefinition();
    this.output.indent();
    this.emitInitMethod();
    this.emitWidgetCreations();
    this.emitBindings();
    this.emitEventHandlers();
    this.emitMainBlock();
    this.output.dedent();
    this.emitPostamble();
    
    return this.output.toString();
  }
  
  private emitImports(): void {
    this.output.line('import tkinter as tk');
    this.output.line('from tkinter import ttk');
    
    // Conditional imports based on widget types used
    const widgetTypes = new Set(this.project.widgets.map(w => w.type));
    if (widgetTypes.has('gauge') || widgetTypes.has('chart')) {
      this.output.line('from tk_tools import Gauge, Graph');
    }
    if (this.project.instruments.length > 0) {
      this.output.line('import pyvisa');
    }
    if (this.project.alarms.length > 0) {
      this.output.line('from threading import Timer');
    }
    
    // User-defined imports
    for (const imp of this.project.settings.importStatements) {
      this.output.line(imp);
    }
    
    this.output.blank();
  }
  
  private emitClassDefinition(): void {
    const className = toPascalCase(this.project.metadata.name);
    this.output.line(`class ${className}:`);
  }
  
  private emitInitMethod(): void {
    this.output.line('def __init__(self, root):');
    this.output.indent();
    this.output.line('self.root = root');
    this.output.line(`self.root.title("${this.project.settings.windowTitle}")`);
    this.output.line(`self.root.geometry("${this.project.settings.windowWidth}x${this.project.settings.windowHeight}")`);
    
    // Initialize state variables
    for (const sv of this.project.stateVariables) {
      const value = formatPythonValue(sv.initialValue, sv.type);
      this.output.line(`self.${sv.name} = ${value}`);
    }
    
    // Initialize instruments
    for (const inst of this.project.instruments) {
      this.output.line(`# ${inst.name}: ${inst.type} instrument`);
      this.output.line(`self.${inst.name} = None  # TODO: Initialize connection`);
    }
    
    this.output.dedent();
    this.output.blank();
  }
  
  private emitWidgetCreations(): void {
    // Sort widgets: parents before children
    const sorted = this.topologicalSort(this.project.widgets);
    
    for (const widget of sorted) {
      const visitor = WIDGET_VISITORS[widget.type];
      if (visitor) {
        visitor.emit(this.output, widget, this.project);
      } else {
        this.output.line(`# TODO: Unsupported widget type "${widget.type}"`);
      }
    }
    
    this.output.blank();
  }
  
  // Sort widgets so parents are created before children
  private topologicalSort(widgets: WidgetIR[]): WidgetIR[] {
    const byId = new Map(widgets.map(w => [w.id, w]));
    const sorted: WidgetIR[] = [];
    const visited = new Set<string>();
    
    const visit = (w: WidgetIR) => {
      if (visited.has(w.id)) return;
      visited.add(w.id);
      if (w.parentId) {
        const parent = byId.get(w.parentId);
        if (parent) visit(parent);
      }
      sorted.push(w);
    };
    
    widgets.forEach(visit);
    return sorted;
  }
  
  // ... additional emit methods
}

// CodeBuilder utility for indentation management
class CodeBuilder {
  private lines: string[] = [];
  private indentLevel = 0;
  private readonly INDENT = '    '; // 4 spaces
  
  line(text: string): void {
    this.lines.push(this.INDENT.repeat(this.indentLevel) + text);
  }
  
  blank(): void {
    this.lines.push('');
  }
  
  indent(): void { this.indentLevel++; }
  dedent(): void { this.indentLevel = Math.max(0, this.indentLevel - 1); }
  
  toString(): string {
    return this.lines.join('\n');
  }
}
```

#### 4.2.3 Widget Visitor Example (Button)

```typescript
// src/generators/tkinter/WidgetVisitors.ts

export const WIDGET_VISITORS: Record<WidgetType, WidgetVisitor> = {
  button: {
    emit(builder: CodeBuilder, widget: WidgetIR, project: ProjectIR): void {
      const parentRef = widget.parentId 
        ? `self.${project.widgets.find(w => w.id === widget.parentId)?.name}`
        : 'self.root';
      
      // Variable name
      builder.line(`# ${widget.name}: Button`);
      
      // Creation
      const text = formatPythonString(widget.properties.text as string || widget.name);
      builder.line(`self.${widget.name} = tk.Button(`);
      builder.indent();
      builder.line(`${parentRef},`);
      builder.line(`text=${text},`);
      
      // Style properties
      if (widget.style.bgColor) {
        builder.line(`bg="${widget.style.bgColor}",`);
      }
      if (widget.style.fgColor) {
        builder.line(`fg="${widget.style.fgColor}",`);
      }
      if (widget.style.fontFamily || widget.style.fontSize) {
        const font = formatFont(widget.style);
        builder.line(`font=${font},`);
      }
      
      // Event bindings
      const clickEvent = widget.events.find(e => e.trigger === 'click');
      if (clickEvent) {
        builder.line(`command=self._on_${widget.name}_click,`);
      }
      
      builder.dedent();
      builder.line(')');
      
      // Geometry
      builder.line(`self.${widget.name}.place(`);
      builder.indent();
      builder.line(`x=${widget.x},`);
      builder.line(`y=${widget.y},`);
      builder.line(`width=${widget.width},`);
      builder.line(`height=${widget.height},`);
      builder.dedent();
      builder.line(')');
      builder.blank();
    },
  },
  
  label: {
    // Similar pattern for Label...
  },
  
  // ... all widget types
};
```

#### 4.2.4 Web Worker Integration

```typescript
// src/hooks/useCodeGeneration.ts

import { useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useDebounce } from './useDebounce';

// Vite supports ?worker imports
import CodeGeneratorWorker from '@/workers/codeGenerator.worker?worker';

export function useCodeGeneration() {
  const project = useProjectStore(s => s.project);
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<number>(0);
  
  // Initialize worker
  useEffect(() => {
    workerRef.current = new CodeGeneratorWorker();
    return () => workerRef.current?.terminate();
  }, []);
  
  // Debounced generation trigger
  const debouncedProject = useDebounce(project, 300);
  
  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) return;
    
    const requestId = ++pendingRef.current;
    
    worker.postMessage({
      type: 'generate',
      requestId,
      project: debouncedProject,
    });
    
    worker.onmessage = (event) => {
      const { requestId: responseId, code, error } = event.data;
      // Ignore stale responses
      if (responseId < pendingRef.current) return;
      
      if (error) {
        console.error('Code generation error:', error);
        return;
      }
      
      // Dispatch to UI store for Monaco
      useUIStore.getState().setGeneratedCode(code);
    };
  }, [debouncedProject]);
}
```

```typescript
// src/workers/codeGenerator.worker.ts

import { TkinterGenerator } from '@/generators/tkinter/TkinterGenerator';

self.onmessage = (event) => {
  const { type, requestId, project } = event.data;
  
  if (type === 'generate') {
    try {
      const generator = new TkinterGenerator(project);
      const code = generator.generate();
      self.postMessage({ requestId, code });
    } catch (error) {
      self.postMessage({ 
        requestId, 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  }
};
```

### 4.3 Persistence Flow

#### 4.3.1 Save Flow

```typescript
// src/hooks/useFileHandling.ts

export async function saveProject(project: ProjectIR): Promise<boolean> {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const fileName = `${project.metadata.name}.gui.json`;
  
  // Try File System Access API first
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: [{
          description: 'LabGUI Project',
          accept: { 'application/json': ['.gui.json'] },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      // User cancelled or API not available
      if ((err as Error).name === 'AbortError') return false;
      console.warn('File System Access API failed, falling back:', err);
    }
  }
  
  // Fallback: traditional download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
```

#### 4.3.2 Load Flow

```typescript
// src/hooks/useFileHandling.ts

export async function loadProject(): Promise<ProjectIR | null> {
  // Try File System Access API
  if ('showOpenFilePicker' in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'LabGUI Project',
          accept: { 'application/json': ['.gui.json'] },
        }],
        multiple: false,
      });
      const file = await handle.getFile();
      const text = await file.text();
      return parseAndValidateProject(text);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return null;
      console.warn('File System Access API failed, falling back:', err);
    }
  }
  
  // Fallback: traditional file input
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gui.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const text = await file.text();
      resolve(parseAndValidateProject(text));
    };
    input.click();
  });
}

function parseAndValidateProject(json: string): ProjectIR | null {
  try {
    const parsed = JSON.parse(json);
    
    // Validate with Zod schema
    const result = ProjectIRSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Project validation failed:', result.error);
      alert('Invalid project file. See console for details.');
      return null;
    }
    
    // Migrate if needed
    return migrateProject(result.data);
  } catch {
    alert('Could not parse project file. Is it valid JSON?');
    return null;
  }
}
```

#### 4.3.3 Auto-Save Flow

```typescript
// src/store/autoSaveMiddleware.ts

const AUTOSAVE_KEY = 'labgui_autosave';
const AUTOSAVE_INTERVAL = 5000; // 5 seconds

export function enableAutoSave(store: ProjectStore): () => void {
  let timeout: ReturnType<typeof setTimeout>;
  
  const save = () => {
    try {
      const json = JSON.stringify(store.project);
      localStorage.setItem(AUTOSAVE_KEY, json);
      localStorage.setItem(`${AUTOSAVE_KEY}_timestamp`, Date.now().toString());
    } catch (err) {
      console.warn('Auto-save failed (storage full?):', err);
    }
  };
  
  // Subscribe to project changes
  const unsubscribe = useProjectStore.subscribe(
    (state) => state.project,
    (project) => {
      clearTimeout(timeout);
      timeout = setTimeout(save, AUTOSAVE_INTERVAL);
    }
  );
  
  return () => {
    unsubscribe();
    clearTimeout(timeout);
  };
}

export function recoverAutoSave(): ProjectIR | null {
  try {
    const json = localStorage.getItem(AUTOSAVE_KEY);
    const timestamp = localStorage.getItem(`${AUTOSAVE_KEY}_timestamp`);
    
    if (!json) return null;
    
    // Check if auto-save is recent (< 7 days)
    const age = Date.now() - parseInt(timestamp || '0');
    if (age > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(AUTOSAVE_KEY);
      return null;
    }
    
    const parsed = JSON.parse(json);
    const result = ProjectIRSchema.safeParse(parsed);
    return result.success ? migrateProject(result.data) : null;
  } catch {
    return null;
  }
}
```

---

## 5. Performance Considerations

### 5.1 Canvas Widget Rendering (100+ Widgets)

```typescript
// src/components/canvas/Canvas.tsx — virtual rendering approach

import { useMemo, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useProjectStore } from '@/store/projectStore';
import { CanvasWidget } from './CanvasWidget';

// Viewport culling: only render widgets visible in viewport
function useVisibleWidgets(
  widgets: WidgetIR[],
  viewportRect: { x: number; y: number; width: number; height: number },
  zoom: number
): WidgetIR[] {
  return useMemo(() => {
    const margin = 50; // pixels of overscan
    return widgets.filter(w => 
      w.x * zoom < viewportRect.x + viewportRect.width + margin &&
      (w.x + w.width) * zoom > viewportRect.x - margin &&
      w.y * zoom < viewportRect.y + viewportRect.height + margin &&
      (w.y + w.height) * zoom > viewportRect.y - margin
    );
  }, [widgets, viewportRect, zoom]);
}

export function Canvas() {
  const widgets = useProjectStore(s => s.project.widgets);
  const zoom = useUIStore(s => s.zoom);
  const panOffset = useUIStore(s => s.panOffset);
  const [viewportRect, setViewportRect] = useState({ x: 0, y: 0, width: 800, height: 600 });
  
  // Use ResizeObserver to track viewport dimensions
  const canvasRef = useResizeObserver(setViewportRect);
  
  // Only render visible widgets
  const visibleWidgets = useVisibleWidgets(widgets, viewportRect, zoom);
  
  return (
    <div 
      ref={canvasRef}
      className="relative w-full h-full overflow-hidden"
    >
      {/* Grid background */}
      <GridOverlay 
        zoom={zoom} 
        panOffset={panOffset} 
        viewportRect={viewportRect}
      />
      
      {/* Widget DOM nodes — only visible ones */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {visibleWidgets.map(widget => (
          <CanvasWidget key={widget.id} widgetId={widget.id} />
        ))}
      </div>
      
      {/* Selection overlay */}
      <SelectionOverlay 
        zoom={zoom} 
        panOffset={panOffset}
      />
    </div>
  );
}
```

### 5.2 Memoization Strategy

```typescript
// CanvasWidget is memoized — only re-renders when:
// - Its own properties change
// - Its selection state changes
// - Zoom changes (affects wireframe text size)

export const CanvasWidget = memo(function CanvasWidget({ widgetId }: { widgetId: string }) {
  // ... render
}, (prev, next) => prev.widgetId === next.widgetId); // Stable ID comparison

// The parent Canvas component uses widget IDs as keys,
// so React only re-renders added/removed/changed widgets
```

### 5.3 Undo/Redo Memory Management

```typescript
// src/store/historyMiddleware.ts — memory optimization

interface HistoryOptimizationConfig {
  maxDepth: number;              // Maximum entries (default: 200)
  maxMemoryMB: number;           // Memory limit (default: 50MB)
  compressConsecutive: boolean;  // Merge rapid-fire operations (default: true)
  compressInterval: number;      // Merge window in ms (default: 500)
}

/**
 * Consecutive operation compression:
 * Multiple rapid position updates (e.g., drag at 60fps)
 * are merged into a single history entry recording
 * the start and end positions, not every intermediate frame.
 */
function shouldCompressWithPrevious(
  current: string,        // action description
  previous: string,
  currentTime: number,
  previousTime: number,
  interval: number
): boolean {
  // Same action type within compression window
  return current === previous && (currentTime - previousTime) < interval;
}

/**
 * Memory-aware pruning:
 * When history exceeds maxMemoryMB, remove oldest entries
 * while preserving checkpoints (every Nth entry).
 */
function pruneHistory(
  history: HistoryEntry[],
  maxBytes: number
): HistoryEntry[] {
  const estimatedBytes = JSON.stringify(history).length * 2; // rough UTF-16 estimate
  
  if (estimatedBytes <= maxBytes) return history;
  
  // Keep every 10th entry as checkpoint, remove intermediates
  const pruned: HistoryEntry[] = [];
  for (let i = 0; i < history.length; i++) {
    if (i < 10 || i % 10 === 0 || i >= history.length - 10) {
      pruned.push(history[i]);
    }
  }
  
  return pruned;
}
```

### 5.4 Code Generation Debouncing

```typescript
// src/hooks/useDebounce.ts

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
}
```

### 5.5 Canvas Re-Render Optimization

| Scenario | Optimization | Implementation |
|---|---|---|
| Widget drag | `transform: translate()` on DOM node | No React re-render; direct style manipulation |
| Widget resize | Direct `width/height` style update | Debounced IR update at drag end |
| Property edit | `React.memo` on CanvasWidget | Shallow prop comparison |
| Zoom change | CSS `transform: scale()` on container | Single container transform, no per-widget updates |
| Pan change | CSS `transform: translate()` on container | Same as zoom |
| Selection change | SelectionOverlay only | CanvasWidget re-render only for newly selected/deselected |
| New widget | Append to list | React key-based diff, only new widget mounts |
| Delete widget | Remove from list | React key-based diff, only removed widget unmounts |

---

## 6. Browser APIs & Capabilities

### 6.1 File System Access API

```typescript
// src/utils/fileSystemAccess.ts

/**
 * Feature detection and graceful degradation.
 */
export const supportsFileSystemAccess = 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;

/**
 * File handle for "Save" (overwrites existing) vs "Save As" (new file).
 * Persisted in session for subsequent saves.
 */
let currentFileHandle: FileSystemFileHandle | null = null;

export async function saveWithFilePicker(
  blob: Blob, 
  suggestedName: string
): Promise<'saved' | 'cancelled' | 'fallback'> {
  try {
    // Re-use handle if we have one ("Save" behavior)
    const handle = currentFileHandle || await window.showSaveFilePicker!({
      suggestedName,
      types: [{
        description: 'LabGUI Project',
        accept: { 'application/json': ['.gui.json'] },
      }],
    });
    
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    
    currentFileHandle = handle;
    return 'saved';
  } catch (err) {
    if ((err as Error).name === 'AbortError') return 'cancelled';
    return 'fallback';
  }
}

export function clearFileHandle(): void {
  currentFileHandle = null;
}
```

### 6.2 localStorage

```typescript
// src/utils/localStorage.ts

const STORAGE_PREFIX = 'labgui_';

export const StorageKeys = {
  AUTO_SAVE: `${STORAGE_PREFIX}autosave`,
  AUTO_SAVE_TIMESTAMP: `${STORAGE_PREFIX}autosave_ts`,
  USER_PREFERENCES: `${STORAGE_PREFIX}prefs`,
  RECENT_FILES: `${STORAGE_PREFIX}recent`,
  UI_STATE: `${STORAGE_PREFIX}ui`,
  WIDGET_PALETTE_STATE: `${STORAGE_PREFIX}palette`,
} as const;

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultGridSize: number;
  snapToGrid: boolean;
  defaultWindowSize: { width: number; height: number };
  codePanelHeight: number;
  leftSidebarWidth: number;
  rightSidebarWidth: number;
  recentProjects: string[]; // names only, not paths
}

export function loadPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(StorageKeys.USER_PREFERENCES);
    if (stored) return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    // ignore parse errors
  }
  return DEFAULT_PREFERENCES;
}

export function savePreferences(prefs: UserPreferences): void {
  localStorage.setItem(StorageKeys.USER_PREFERENCES, JSON.stringify(prefs));
}

// 5MB limit monitoring
export function getLocalStorageUsage(): { used: number; remaining: number } {
  let used = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) || '';
    const value = localStorage.getItem(key) || '';
    used += key.length + value.length;
  }
  return { used, remaining: 5 * 1024 * 1024 - used }; // ~5MB limit
}
```

### 6.3 Clipboard API

```typescript
// src/canvas/clipboard.ts

import { WidgetIR } from '@/ir/types';

const CLIPBOARD_MIME_TYPE = 'application/x-labgui-widgets';

/**
 * Copy widgets to system clipboard (for cross-tab paste).
 */
export async function copyToClipboard(widgets: WidgetIR[]): Promise<void> {
  const serialized = JSON.stringify(widgets);
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(serialized);
  } else {
    // Fallback: use document.execCommand
    const textarea = document.createElement('textarea');
    textarea.value = serialized;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/**
 * Paste widgets from system clipboard.
 */
export async function pasteFromClipboard(): Promise<WidgetIR[] | null> {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text);
    
    // Validate it's our widget format
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].type) {
      // Generate new IDs to avoid collisions
      return parsed.map((w: WidgetIR) => ({
        ...w,
        id: nanoid(),
        name: w.name + '_copy',
        x: w.x + 20, // Offset pasted widgets
        y: w.y + 20,
      }));
    }
  } catch {
    // Not our format or clipboard empty
  }
  return null;
}

/**
 * Internal clipboard (same-tab only, stores full objects).
 */
export function useInternalClipboard() {
  const [clipboard, setClipboard] = useState<WidgetIR[] | null>(null);
  
  const copy = useCallback((widgets: WidgetIR[]) => {
    // Deep clone to prevent reference issues
    setClipboard(structuredClone(widgets));
    // Also write to system clipboard
    copyToClipboard(widgets).catch(console.warn);
  }, []);
  
  const paste = useCallback(async (): Promise<WidgetIR[] | null> => {
    // Prefer internal clipboard
    if (clipboard) {
      return clipboard.map(w => ({
        ...structuredClone(w),
        id: nanoid(),
        x: w.x + 20,
        y: w.y + 20,
      }));
    }
    // Fall back to system clipboard
    return pasteFromClipboard();
  }, [clipboard]);
  
  return { copy, paste, clipboard };
}
```

### 6.4 ResizeObserver

```typescript
// src/hooks/useResizeObserver.ts

export function useResizeObserver(
  onResize: (rect: DOMRectReadOnly) => void
): RefObject<HTMLDivElement> {
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        onResize(entry.contentRect);
      }
    });
    
    observer.observe(element);
    return () => observer.disconnect();
  }, [onResize]);
  
  return ref;
}
```

### 6.5 Keyboard Shortcut Handling

```typescript
// src/hooks/useKeyboardShortcuts.ts

import { useEffect, useCallback } from 'react';

export interface ShortcutMap {
  [keyCombo: string]: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutMap): void {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const combo: string[] = [];
    if (event.ctrlKey || event.metaKey) combo.push('Ctrl');
    if (event.shiftKey) combo.push('Shift');
    if (event.altKey) combo.push('Alt');
    combo.push(event.key);
    
    const key = combo.join('+');
    const handler = shortcuts[key];
    
    if (handler) {
      event.preventDefault();
      handler();
    }
  }, [shortcuts]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Usage in App.tsx
const shortcuts: ShortcutMap = {
  'Ctrl+z': () => projectStore.undo(),
  'Ctrl+Shift+z': () => projectStore.redo(),
  'Ctrl+y': () => projectStore.redo(),
  'Ctrl+c': () => clipboard.copy(selectedWidgets),
  'Ctrl+v': () => handlePaste(),
  'Ctrl+x': () => { clipboard.copy(selectedWidgets); projectStore.deleteSelected(selectedIds); },
  'Ctrl+s': () => saveProject(projectStore.project),
  'Ctrl+o': () => handleLoad(),
  'Ctrl+n': () => newProject(),
  'Ctrl+a': () => uiStore.selectAllWidgets(),
  'Delete': () => projectStore.deleteSelected(selectedIds),
  'Ctrl+g': () => uiStore.toggleSnapToGrid(),
  'Ctrl+=': () => uiStore.zoomIn(),
  'Ctrl+-': () => uiStore.zoomOut(),
  'Ctrl+0': () => uiStore.zoomToFit(),
  'Escape': () => uiStore.deselectAll(),
  'ArrowUp': () => nudgeSelected(0, -1),
  'ArrowDown': () => nudgeSelected(0, 1),
  'ArrowLeft': () => nudgeSelected(-1, 0),
  'ArrowRight': () => nudgeSelected(1, 0),
};

useKeyboardShortcuts(shortcuts);
```

---

## 7. Deployment Architecture

### 7.1 Build Pipeline

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
│ 1. Checkout     │  actions/checkout@v4
│ 2. Setup Node   │  actions/setup-node@v4 (20.x)
│ 3. Install deps │  npm ci
│ 4. Type check   │  npx tsc --noEmit
│ 5. Lint         │  npx eslint src/
│ 6. Test         │  npx vitest run
│ 7. Build        │  npx vite build
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vite Build      │  vite.config.ts
│                 │  - Code splitting by route
│                 │  - Tree shaking
│                 │  - Minification (esbuild)
│                 │  - Asset optimization
│                 │  - Source maps (external)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ dist/ output    │  Static files:
│                 │  - index.html
│                 │  - assets/*.js (chunked)
│                 │  - assets/*.css
│                 │  - assets/*.woff2 (fonts)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Deploy to       │  Branch: gh-pages
│ GitHub Pages    │  Custom domain: optional
│                 │  HTTPS enabled
└─────────────────┘
```

### 7.2 Vite Configuration

```typescript
// vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    
    rollupOptions: {
      output: {
        manualChunks: {
          // Core vendor chunk (always loaded)
          vendor: ['react', 'react-dom', 'zustand', 'immer'],
          
          // DnD chunk (loaded when user starts interacting)
          dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          
          // Editor chunk (loaded on first CodePanel open)
          editor: ['@monaco-editor/react', 'monaco-editor'],
          
          // Utils chunk
          utils: ['nanoid', 'zod', 'dequal'],
        },
      },
    },
    
    // Asset handling
    assetsInlineLimit: 4096, // Inline assets < 4KB
    chunkSizeWarningLimit: 500,
  },
  
  // Development
  server: {
    port: 3000,
    open: true,
  },
  
  // Base path for GitHub Pages (repo name if project page)
  base: '/',
});
```

### 7.3 Service Worker (Cache Busting & Offline)

```typescript
// src/service-worker.ts

const CACHE_NAME = 'labgui-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/vendor.js',
  '/assets/dnd.js',
  '/assets/editor.js',
  '/assets/utils.js',
];

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request);
    })
  );
});
```

### 7.4 No-Server Architecture

```
┌──────────────────────────────────────────────────────┐
│                    GitHub Pages                       │
│              (Static file hosting)                    │
│                                                       │
│  ┌─────────────┐    ┌─────────────┐                  │
│  │ index.html  │    │ assets/     │                  │
│  │ (shell)     │    │ *.js chunks │                  │
│  │             │    │ *.css       │                  │
│  │             │    │ *.woff2     │                  │
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

### 7.5 Environment Configuration

```typescript
// src/constants/env.ts

/**
 * Environment-specific configuration.
 * All values are compile-time constants via import.meta.env.
 */
export const ENV = {
  // App info
  APP_NAME: 'LabGUI Builder',
  APP_VERSION: import.meta.env.PACKAGE_VERSION || '1.0.0',
  
  // Build info
  BUILD_DATE: new Date().toISOString(),
  IS_DEV: import.meta.env.DEV,
  IS_PROD: import.meta.env.PROD,
  
  // Feature flags
  FEATURES: {
    FILE_SYSTEM_ACCESS: !import.meta.env.VITE_DISABLE_FSA,
    WEB_WORKER: !import.meta.env.VITE_DISABLE_WORKERS,
    SERVICE_WORKER: import.meta.env.PROD,
    MONACO_EDITOR: !import.meta.env.VITE_DISABLE_MONACO,
  },
  
  // IR format version for migration
  IR_VERSION: '1.0',
  
  // URLs
  REPO_URL: 'https://github.com/your-org/labgui-builder',
  DOCS_URL: 'https://your-org.github.io/labgui-builder/docs',
} as const;
```

---

## Appendix A: Widget Catalog Definition

```typescript
// src/constants/widgetCatalog.ts

export interface WidgetDefinition {
  type: WidgetType;
  category: 'input' | 'display' | 'layout' | 'lab';
  displayName: string;
  icon: LucideIcon;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable: boolean;
  container: boolean;        // Can have child widgets?
  properties: PropertyDef[];
  defaultStyle: Partial<WidgetStyle>;
  tkinterClass: string;      // e.g., 'tk.Button', 'ttk.Entry'
}

export interface PropertyDef {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'font' | 'choice' | 'multiline';
  options?: string[];         // for 'choice' type
  defaultValue: unknown;
  bindable: boolean;          // Can be bound to a state variable?
  description: string;
}

export const WIDGET_CATALOG: WidgetDefinition[] = [
  {
    type: 'button',
    category: 'input',
    displayName: 'Button',
    icon: MousePointerClick,
    description: 'Clickable button that triggers an action',
    defaultWidth: 100,
    defaultHeight: 30,
    minWidth: 40,
    minHeight: 20,
    resizable: true,
    container: false,
    properties: [
      { name: 'text', displayName: 'Label', type: 'string', defaultValue: 'Button', bindable: true, description: 'Button text' },
      { name: 'command', displayName: 'Command', type: 'string', defaultValue: '', bindable: false, description: 'Python function to call' },
      { name: 'state', displayName: 'State', type: 'choice', options: ['normal', 'active', 'disabled'], defaultValue: 'normal', bindable: true, description: 'Button state' },
    ],
    defaultStyle: { fontSize: 12, relief: 'raised' },
    tkinterClass: 'tk.Button',
  },
  {
    type: 'label',
    category: 'display',
    displayName: 'Label',
    icon: Type,
    description: 'Static or dynamic text display',
    defaultWidth: 120,
    defaultHeight: 24,
    minWidth: 20,
    minHeight: 16,
    resizable: true,
    container: false,
    properties: [
      { name: 'text', displayName: 'Text', type: 'string', defaultValue: 'Label', bindable: true, description: 'Display text' },
      { name: 'textvariable', displayName: 'Variable', type: 'string', defaultValue: '', bindable: false, description: 'Tkinter variable name' },
      { name: 'anchor', displayName: 'Anchor', type: 'choice', options: ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw', 'center'], defaultValue: 'center', bindable: false, description: 'Text alignment' },
      { name: 'justify', displayName: 'Justify', type: 'choice', options: ['left', 'center', 'right'], defaultValue: 'center', bindable: false, description: 'Multi-line justification' },
    ],
    defaultStyle: { fontSize: 12 },
    tkinterClass: 'tk.Label',
  },
  {
    type: 'entry',
    category: 'input',
    displayName: 'Text Entry',
    icon: TextCursorInput,
    description: 'Single-line text input field',
    defaultWidth: 150,
    defaultHeight: 24,
    minWidth: 40,
    minHeight: 20,
    resizable: true,
    container: false,
    properties: [
      { name: 'textvariable', displayName: 'Variable', type: 'string', defaultValue: '', bindable: true, description: 'Bound variable' },
      { name: 'show', displayName: 'Mask', type: 'string', defaultValue: '', bindable: false, description: 'Character to display (for passwords)' },
      { name: 'state', displayName: 'State', type: 'choice', options: ['normal', 'disabled', 'readonly'], defaultValue: 'normal', bindable: true, description: 'Entry state' },
    ],
    defaultStyle: { fontSize: 12, relief: 'sunken' },
    tkinterClass: 'tk.Entry',
  },
  {
    type: 'frame',
    category: 'layout',
    displayName: 'Frame',
    icon: Layout,
    description: 'Container for grouping widgets',
    defaultWidth: 200,
    defaultHeight: 150,
    minWidth: 20,
    minHeight: 20,
    resizable: true,
    container: true,
    properties: [
      { name: 'borderwidth', displayName: 'Border Width', type: 'number', defaultValue: 0, bindable: false, description: 'Frame border width' },
      { name: 'relief', displayName: 'Relief', type: 'choice', options: ['flat', 'raised', 'sunken', 'groove', 'ridge'], defaultValue: 'flat', bindable: false, description: 'Frame border style' },
    ],
    defaultStyle: {},
    tkinterClass: 'tk.Frame',
  },
  {
    type: 'gauge',
    category: 'lab',
    displayName: 'Gauge',
    icon: Gauge,
    description: 'Circular analog gauge for numeric values',
    defaultWidth: 150,
    defaultHeight: 150,
    minWidth: 60,
    minHeight: 60,
    resizable: true,
    container: false,
    properties: [
      { name: 'min', displayName: 'Minimum', type: 'number', defaultValue: 0, bindable: false, description: 'Minimum scale value' },
      { name: 'max', displayName: 'Maximum', type: 'number', defaultValue: 100, bindable: false, description: 'Maximum scale value' },
      { name: 'value', displayName: 'Value', type: 'number', defaultValue: 0, bindable: true, description: 'Current value' },
      { name: 'units', displayName: 'Units', type: 'string', defaultValue: '', bindable: false, description: 'Unit label' },
      { name: 'threshold', displayName: 'Alarm Threshold', type: 'number', defaultValue: 80, bindable: false, description: 'Warning threshold' },
    ],
    defaultStyle: {},
    tkinterClass: 'tk_tools.Gauge',
  },
  // ... additional widget definitions
];
```

## Appendix B: Keyboard Shortcuts Reference

| Shortcut | Action |
|---|---|
| `Ctrl+N` | New project |
| `Ctrl+O` | Open project |
| `Ctrl+S` | Save project |
| `Ctrl+Shift+S` | Save project as |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+C` | Copy selected widgets |
| `Ctrl+V` | Paste widgets |
| `Ctrl+X` | Cut selected widgets |
| `Ctrl+A` | Select all widgets |
| `Delete` | Delete selected widgets |
| `Ctrl+D` | Duplicate selected widgets |
| `Ctrl+G` | Toggle snap to grid |
| `Ctrl++` / `Ctrl+=` | Zoom in |
| `Ctrl+-` | Zoom out |
| `Ctrl+0` | Zoom to fit |
| `Ctrl+1` | Zoom to 100% |
| `Arrow keys` | Nudge selected widget 1px (10px with Shift) |
| `Shift+drag` | Constrain to axis |
| `Alt+drag` | Duplicate and move |
| `Space+drag` | Pan canvas |
| `Escape` | Deselect all / cancel drag |
| `Ctrl+]` | Bring forward |
| `Ctrl+[` | Send backward |
| `Ctrl+Shift+]` | Bring to front |
| `Ctrl+Shift+[` | Send to back |

## Appendix C: IR Schema Versioning & Migration

```typescript
// src/ir/migrations.ts

/**
 * Migration functions transform IR from one version to the next.
 * Each function: (oldIR) => newIR
 */

type Migration = (ir: any) => any;

const MIGRATIONS: Record<string, Migration> = {
  // v1.0 → v1.1: Add metadata.appVersion field
  '1.0': (ir) => ({
    ...ir,
    metadata: {
      ...ir.metadata,
      appVersion: '1.0.0',
      version: '1.1',
    },
  }),
  
  // v1.1 → v1.2: Rename 'text' widget type to 'label'
  '1.1': (ir) => ({
    ...ir,
    widgets: ir.widgets.map((w: any) => 
      w.type === 'text' ? { ...w, type: 'label' } : w
    ),
    metadata: { ...ir.metadata, version: '1.2' },
  }),
  
  // Add future migrations here...
};

export function migrateProject(ir: any): ProjectIR {
  const currentVersion = ir.metadata?.version || '1.0';
  let migrated = ir;
  
  // Apply migrations sequentially
  for (const [version, migration] of Object.entries(MIGRATIONS)) {
    if (version >= currentVersion) {
      migrated = migration(migrated);
    }
  }
  
  // Final validation
  return ProjectIRSchema.parse(migrated);
}
```

---

## Summary of Key Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **Rendering** | DOM + Canvas 2D hybrid | DOM for widgets (events, CSS), Canvas for overlays (performance) |
| **State** | Two Zustand stores | Separation of persistent (project) and transient (UI) state |
| **History** | Immer patches | Minimal memory, precise undo, debounced compression |
| **Code Gen** | Web Worker + Visitor pattern | Non-blocking UI, extensible for future generators |
| **Persistence** | File System Access API + localStorage | Native file UX with graceful fallback |
| **Canvas DnD** | @dnd-kit | Multi-context support, customizable collision detection |
| **Deployment** | Static site (GitHub Pages) | Zero cost, zero server, CI/CD built-in |
