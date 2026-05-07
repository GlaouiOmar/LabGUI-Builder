import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import type { IRDocument, IRNode, UUID, IRStateVariable, IRInstrument } from '../types/ir';
import { createDefaultNode } from '../types/widgets';

export const CURRENT_VERSION = '1.0.0';

export function createNewDocument(name = 'Untitled Project'): IRDocument {
  const now = new Date().toISOString();
  return {
    version: CURRENT_VERSION,
    project_name: name,
    created_at: now,
    modified_at: now,
    root: {
      id: nanoid(),
      type: 'Frame',
      name: 'main_frame',
      abstract_props: { label: '', enabled: true, visible: true },
      geometry: { x: 0, y: 0, w: 800, h: 600 },
      style: { bg: '#1e1e2e', border_width: 0 },
      events: [],
      children: [],
      locked: false,
      hidden: false,
    },
    state_variables: [],
    instruments: [],
    data_loggers: [],
    alarms: [],
    settings: {
      window_title: 'Lab GUI',
      window_width: 800,
      window_height: 600,
      theme: 'clam',
    },
  };
}

interface HistoryEntry {
  document: IRDocument;
  description: string;
}

interface ProjectState {
  document: IRDocument;
  selectedIds: UUID[];
  isSaved: boolean;
  history: HistoryEntry[];
  historyIndex: number;
  clipboard: IRNode | null;
}

interface ProjectActions {
  setDocument: (doc: IRDocument) => void;
  setProjectName: (name: string) => void;
  updateSettings: (settings: Partial<IRDocument['settings']>) => void;

  addWidget: (type: IRNode['type'], parentId: UUID, position: { x: number; y: number }) => void;
  removeWidget: (id: UUID) => void;
  removeSelectedWidgets: () => void;
  moveWidget: (id: UUID, parentId: UUID | null, position: { x: number; y: number }) => void;
  updateWidget: (id: UUID, updates: Partial<IRNode>) => void;
  updateWidgetGeometry: (id: UUID, geometry: Partial<IRNode['geometry']>) => void;
  updateWidgetsGeometry: (updates: Record<UUID, Partial<IRNode['geometry']>>) => void;
  updateWidgetProps: (id: UUID, props: Partial<IRNode['abstract_props']>) => void;
  updateWidgetStyle: (id: UUID, style: Partial<IRNode['style']>) => void;
  setSelectedId: (id: UUID | null) => void;
  toggleSelection: (id: UUID) => void;
  selectAll: () => void;
  clearSelection: () => void;
  nudgeSelected: (dx: number, dy: number) => void;

  copyWidget: (id: UUID) => void;
  pasteWidget: (parentId: UUID, offset?: { x: number; y: number }) => void;

  addStateVariable: (sv: IRStateVariable) => void;
  removeStateVariable: (id: UUID) => void;
  updateStateVariable: (id: UUID, updates: Partial<IRStateVariable>) => void;

  addInstrument: (inst: IRInstrument) => void;
  removeInstrument: (id: UUID) => void;
  updateInstrument: (id: UUID, updates: Partial<IRInstrument>) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  exportToJSON: () => string;
  loadFromJSON: (json: string) => void;
}

function findNode(root: IRNode, id: UUID): { node: IRNode; parent: IRNode | null } | null {
  if (root.id === id) return { node: root, parent: null };
  for (const child of root.children) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

function removeNodeFromParent(root: IRNode, id: UUID): boolean {
  const idx = root.children.findIndex((c) => c.id === id);
  if (idx >= 0) {
    root.children.splice(idx, 1);
    return true;
  }
  for (const child of root.children) {
    if (removeNodeFromParent(child, id)) return true;
  }
  return false;
}

function cloneNode(node: IRNode, newParentId?: string): IRNode {
  const cloned: IRNode = {
    ...node,
    id: nanoid(),
    name: `${node.name}_copy`,
    parent: newParentId,
    children: node.children.map((child) => cloneNode(child)),
    geometry: { ...node.geometry },
    abstract_props: { ...node.abstract_props },
    style: node.style ? { ...node.style } : undefined,
    events: node.events.map((e) => ({ ...e })),
  };
  return cloned;
}

function cloneDoc(doc: IRDocument): IRDocument {
  return JSON.parse(JSON.stringify(doc));
}

const MAX_HISTORY = 100;

function collectAllNodes(root: IRNode): IRNode[] {
  const result: IRNode[] = [root];
  for (const child of root.children) {
    result.push(...collectAllNodes(child));
  }
  return result;
}

export const useProjectStore = create<ProjectState & ProjectActions>()(
  immer((set, get) => ({
    document: createNewDocument(),
    selectedIds: [],
    isSaved: true,
    history: [{ document: createNewDocument(), description: 'New project' }],
    historyIndex: 0,
    clipboard: null,

    setDocument: (doc) => set({
      document: doc,
      isSaved: true,
      selectedIds: [],
      history: [{ document: cloneDoc(doc), description: 'Loaded project' }],
      historyIndex: 0,
      clipboard: null,
    }),

    setProjectName: (name) =>
      set((state) => {
        state.document.project_name = name;
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    updateSettings: (settings) =>
      set((state) => {
        Object.assign(state.document.settings, settings);
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    addWidget: (type, parentId, position) =>
      set((state) => {
        const parent = findNode(state.document.root, parentId)?.node;
        if (!parent) return;
        const newNode = createDefaultNode(type, position, nanoid());
        newNode.parent = parentId;
        parent.children.push(newNode);
        state.selectedIds = [newNode.id];
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ document: cloneDoc(state.document), description: `Add ${type}` });
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }),

    removeWidget: (id) =>
      set((state) => {
        if (id === state.document.root.id) return;
        removeNodeFromParent(state.document.root, id);
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ document: cloneDoc(state.document), description: 'Remove widget' });
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }),

    removeSelectedWidgets: () =>
      set((state) => {
        for (const id of state.selectedIds) {
          if (id === state.document.root.id) continue;
          removeNodeFromParent(state.document.root, id);
        }
        state.selectedIds = [];
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ document: cloneDoc(state.document), description: 'Remove selected' });
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }),

    moveWidget: (id, parentId, position) =>
      set((state) => {
        const result = findNode(state.document.root, id);
        if (!result) return;
        const { node } = result;
        removeNodeFromParent(state.document.root, id);
        const targetParent = parentId ? findNode(state.document.root, parentId)?.node : state.document.root;
        if (!targetParent) {
          state.document.root.children.push(node);
          node.parent = state.document.root.id;
        } else {
          targetParent.children.push(node);
          node.parent = targetParent.id;
        }
        node.geometry.x = position.x;
        node.geometry.y = position.y;
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ document: cloneDoc(state.document), description: 'Move widget' });
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }),

    updateWidget: (id, updates) =>
      set((state) => {
        const result = findNode(state.document.root, id);
        if (!result) return;
        Object.assign(result.node, updates);
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    updateWidgetGeometry: (id, geometry) =>
      set((state) => {
        const result = findNode(state.document.root, id);
        if (!result) return;
        Object.assign(result.node.geometry, geometry);
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    updateWidgetsGeometry: (updates) =>
      set((state) => {
        for (const [id, geom] of Object.entries(updates)) {
          const result = findNode(state.document.root, id);
          if (result) Object.assign(result.node.geometry, geom);
        }
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    nudgeSelected: (dx, dy) =>
      set((state) => {
        for (const id of state.selectedIds) {
          const result = findNode(state.document.root, id);
          if (result) {
            result.node.geometry.x += dx;
            result.node.geometry.y += dy;
          }
        }
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    updateWidgetProps: (id, props) =>
      set((state) => {
        const result = findNode(state.document.root, id);
        if (!result) return;
        Object.assign(result.node.abstract_props, props);
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    updateWidgetStyle: (id, style) =>
      set((state) => {
        const result = findNode(state.document.root, id);
        if (!result) return;
        if (!result.node.style) result.node.style = {};
        Object.assign(result.node.style, style);
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
      }),

    setSelectedId: (id) => set({ selectedIds: id ? [id] : [] }),

    toggleSelection: (id) =>
      set((state) => {
        const idx = state.selectedIds.indexOf(id);
        if (idx >= 0) {
          state.selectedIds.splice(idx, 1);
        } else {
          state.selectedIds.push(id);
        }
      }),

    selectAll: () =>
      set((state) => {
        const all = collectAllNodes(state.document.root);
        state.selectedIds = all.map((n) => n.id).filter((id) => id !== state.document.root.id);
      }),

    clearSelection: () => set({ selectedIds: [] }),

    copyWidget: (id) =>
      set((state) => {
        const result = findNode(state.document.root, id);
        if (!result || result.node === state.document.root) return;
        state.clipboard = cloneNode(result.node);
      }),

    pasteWidget: (parentId, offset = { x: 16, y: 16 }) =>
      set((state) => {
        if (!state.clipboard) return;
        const parent = findNode(state.document.root, parentId)?.node;
        if (!parent) return;
        const pasted = cloneNode(state.clipboard);
        pasted.geometry.x += offset.x;
        pasted.geometry.y += offset.y;
        pasted.parent = parentId;
        parent.children.push(pasted);
        state.selectedIds = [pasted.id];
        state.document.modified_at = new Date().toISOString();
        state.isSaved = false;
        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push({ document: cloneDoc(state.document), description: 'Paste widget' });
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      }),

    addStateVariable: (sv) =>
      set((state) => {
        state.document.state_variables.push(sv);
        state.isSaved = false;
      }),

    removeStateVariable: (id) =>
      set((state) => {
        state.document.state_variables = state.document.state_variables.filter((s) => s.id !== id);
        state.isSaved = false;
      }),

    updateStateVariable: (id, updates) =>
      set((state) => {
        const sv = state.document.state_variables.find((s) => s.id === id);
        if (sv) Object.assign(sv, updates);
        state.isSaved = false;
      }),

    addInstrument: (inst) =>
      set((state) => {
        state.document.instruments.push(inst);
        state.isSaved = false;
      }),

    removeInstrument: (id) =>
      set((state) => {
        state.document.instruments = state.document.instruments.filter((i) => i.id !== id);
        state.isSaved = false;
      }),

    updateInstrument: (id, updates) =>
      set((state) => {
        const inst = state.document.instruments.find((i) => i.id === id);
        if (inst) Object.assign(inst, updates);
        state.isSaved = false;
      }),

    undo: () =>
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.document = cloneDoc(state.history[state.historyIndex].document);
          state.selectedIds = [];
          state.isSaved = false;
        }
      }),

    redo: () =>
      set((state) => {
        if (state.historyIndex < state.history.length - 1) {
          state.historyIndex++;
          state.document = cloneDoc(state.history[state.historyIndex].document);
          state.selectedIds = [];
          state.isSaved = false;
        }
      }),

    canUndo: () => {
      return get().historyIndex > 0;
    },

    canRedo: () => {
      return get().historyIndex < get().history.length - 1;
    },

    exportToJSON: () => JSON.stringify(get().document, null, 2),

    loadFromJSON: (json) => {
      try {
        const doc: IRDocument = JSON.parse(json);
        if (!doc.version || !doc.root) throw new Error('Invalid document');
        set({
          document: doc,
          isSaved: true,
          selectedIds: [],
          history: [{ document: cloneDoc(doc), description: 'Loaded project' }],
          historyIndex: 0,
          clipboard: null,
        });
      } catch (e) {
        console.error('Failed to load document:', e);
        alert('Failed to load project file. Invalid format.');
      }
    },
  }))
);
