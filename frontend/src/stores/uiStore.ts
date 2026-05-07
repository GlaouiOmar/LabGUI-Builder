import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type RightPanelTab = 'properties' | 'tree' | 'state' | 'instruments' | 'logging' | 'alarms';
export type BottomPanelTab = 'code' | 'preview' | 'console' | 'events';
export type LeftPanelTab = 'widgets' | 'templates';

interface UIState {
  // Panel visibility
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  bottomPanelOpen: boolean;

  // Active tabs
  leftPanelTab: LeftPanelTab;
  rightPanelTab: RightPanelTab;
  bottomPanelTab: BottomPanelTab;

  // Canvas settings
  zoom: number;
  snapToGrid: boolean;
  showGrid: boolean;
  gridSize: number;

  // Drag state
  draggingWidgetType: string | null;
  isResizing: boolean;
}

interface UIActions {
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  toggleBottomPanel: () => void;
  setLeftPanelTab: (tab: LeftPanelTab) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  setBottomPanelTab: (tab: BottomPanelTab) => void;

  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;

  setSnapToGrid: (v: boolean) => void;
  setShowGrid: (v: boolean) => void;
  setGridSize: (size: number) => void;

  setDraggingWidgetType: (type: string | null) => void;
  setIsResizing: (v: boolean) => void;
}

export const useUIStore = create<UIState & UIActions>()(
  immer((set) => ({
    leftPanelOpen: true,
    rightPanelOpen: true,
    bottomPanelOpen: false,

    leftPanelTab: 'widgets',
    rightPanelTab: 'properties',
    bottomPanelTab: 'code',

    zoom: 100,
    snapToGrid: true,
    showGrid: true,
    gridSize: 8,

    draggingWidgetType: null,
    isResizing: false,

    toggleLeftPanel: () => set((s) => { s.leftPanelOpen = !s.leftPanelOpen; }),
    toggleRightPanel: () => set((s) => { s.rightPanelOpen = !s.rightPanelOpen; }),
    toggleBottomPanel: () => set((s) => { s.bottomPanelOpen = !s.bottomPanelOpen; }),
    setLeftPanelTab: (tab) => set({ leftPanelTab: tab }),
    setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
    setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),

    setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(300, zoom)) }),
    zoomIn: () => set((s) => { s.zoom = Math.min(300, s.zoom + 10); }),
    zoomOut: () => set((s) => { s.zoom = Math.max(25, s.zoom - 10); }),
    resetZoom: () => set({ zoom: 100 }),

    setSnapToGrid: (v) => set({ snapToGrid: v }),
    setShowGrid: (v) => set({ showGrid: v }),
    setGridSize: (size) => set({ gridSize: size }),

    setDraggingWidgetType: (type) => set({ draggingWidgetType: type }),
    setIsResizing: (v) => set({ isResizing: v }),
  }))
);
