import { useUIStore } from '../../stores/uiStore';
import { Header } from './Header';
import { WidgetPalette } from '../palette/WidgetPalette';
import { CanvasArea } from '../canvas/CanvasArea';
import { RightSidebar } from './RightSidebar';
import { BottomPanel } from './BottomPanel';

export function AppLayout() {
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const bottomOpen = useUIStore((s) => s.bottomPanelOpen);

  return (
    <div className="flex flex-col h-full w-full bg-lab-crust overflow-hidden select-none">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`flex-shrink-0 border-r border-lab-surface0 bg-lab-mantle transition-all duration-200 ${
            leftOpen ? 'w-60' : 'w-0 overflow-hidden'
          }`}
        >
          <WidgetPalette />
        </aside>

        {/* Center Canvas */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 relative overflow-hidden">
            <CanvasArea />
          </div>

          {/* Bottom Panel */}
          <div
            className={`border-t border-lab-surface0 bg-lab-mantle transition-all duration-200 ${
              bottomOpen ? 'h-64' : 'h-0 overflow-hidden'
            }`}
          >
            <BottomPanel />
          </div>
        </main>

        {/* Right Sidebar */}
        <aside
          className={`flex-shrink-0 border-l border-lab-surface0 bg-lab-mantle transition-all duration-200 ${
            rightOpen ? 'w-72' : 'w-0 overflow-hidden'
          }`}
        >
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}
