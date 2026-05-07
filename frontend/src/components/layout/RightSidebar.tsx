import { useUIStore } from '../../stores/uiStore';
import { PropertiesPanel } from '../panels/PropertiesPanel';
import { WidgetTreePanel } from '../panels/WidgetTreePanel';
import { StateVariablesPanel } from '../panels/StateVariablesPanel';
import { InstrumentsPanel } from '../panels/InstrumentsPanel';
import { DataLoggerPanel } from '../panels/DataLoggerPanel';
import { AlarmPanel } from '../panels/AlarmPanel';

const tabs = [
  { key: 'properties' as const, label: 'Properties' },
  { key: 'tree' as const, label: 'Tree' },
  { key: 'state' as const, label: 'State' },
  { key: 'instruments' as const, label: 'Instruments' },
  { key: 'logging' as const, label: 'Logging' },
  { key: 'alarms' as const, label: 'Alarms' },
];

export function RightSidebar() {
  const activeTab = useUIStore((s) => s.rightPanelTab);
  const setTab = useUIStore((s) => s.setRightPanelTab);

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-lab-surface0 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-[11px] font-medium transition-colors whitespace-nowrap ${
              activeTab === t.key
                ? 'text-lab-blue border-b-2 border-lab-blue bg-lab-surface0/30'
                : 'text-lab-subtext0 hover:text-lab-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'properties' && <PropertiesPanel />}
        {activeTab === 'tree' && <WidgetTreePanel />}
        {activeTab === 'state' && <StateVariablesPanel />}
        {activeTab === 'instruments' && <InstrumentsPanel />}
        {activeTab === 'logging' && <DataLoggerPanel />}
        {activeTab === 'alarms' && <AlarmPanel />}
      </div>
    </div>
  );
}
