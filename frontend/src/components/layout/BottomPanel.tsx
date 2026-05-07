import { useUIStore } from '../../stores/uiStore';
import { CodePanel } from '../editor/CodePanel';
import { PreviewPanel } from '../editor/PreviewPanel';
import { ConsolePanel } from '../editor/ConsolePanel';

const tabs = [
  { key: 'code' as const, label: 'Live Code' },
  { key: 'preview' as const, label: 'Preview' },
  { key: 'console' as const, label: 'Console' },
  { key: 'events' as const, label: 'Event Log' },
];

export function BottomPanel() {
  const activeTab = useUIStore((s) => s.bottomPanelTab);
  const setTab = useUIStore((s) => s.setBottomPanelTab);

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-lab-surface0">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
              activeTab === t.key
                ? 'text-lab-blue border-b-2 border-lab-blue bg-lab-surface0/30'
                : 'text-lab-subtext0 hover:text-lab-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {activeTab === 'code' && <CodePanel />}
        {activeTab === 'preview' && <PreviewPanel />}
        {activeTab === 'console' && <ConsolePanel />}
        {activeTab === 'events' && (
          <div className="p-4 text-lab-overlay0 text-xs">
            Event log will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
