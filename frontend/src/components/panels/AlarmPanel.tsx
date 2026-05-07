import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Trash2, Bell } from 'lucide-react';
import type { IRAlarm } from '../../types/ir';

export function AlarmPanel() {
  const alarms = useProjectStore((s) => s.document.alarms);
  const stateVars = useProjectStore((s) => s.document.state_variables);
  const setDocument = useProjectStore((s) => s.setDocument);
  const document = useProjectStore((s) => s.document);

  const [expanded, setExpanded] = useState<string | null>(null);

  const addAlarm = () => {
    const alarm: IRAlarm = {
      id: nanoid(),
      source: stateVars.length > 0 ? stateVars[0].name : '',
      min: 0,
      max: 100,
      hysteresis: 1,
      action: 'visual',
      enabled: true,
    };
    setDocument({
      ...document,
      alarms: [...document.alarms, alarm],
      modified_at: new Date().toISOString(),
    });
  };

  const removeAlarm = (id: string) => {
    setDocument({
      ...document,
      alarms: document.alarms.filter((a) => a.id !== id),
      modified_at: new Date().toISOString(),
    });
  };

  const updateAlarm = (id: string, updates: Partial<IRAlarm>) => {
    setDocument({
      ...document,
      alarms: document.alarms.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      modified_at: new Date().toISOString(),
    });
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-lab-text">Alarms</span>
        <button
          onClick={addAlarm}
          className="p-1 rounded hover:bg-lab-surface0 text-lab-blue transition-colors"
          title="Add alarm"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {alarms.length === 0 && (
        <div className="text-center text-lab-overlay0 text-xs py-4">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No alarms configured.
          <br />
          Set thresholds on state variables.
        </div>
      )}

      <div className="space-y-2">
        {alarms.map((alarm) => (
          <div key={alarm.id} className="bg-lab-surface0/50 rounded overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === alarm.id ? null : alarm.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-lab-surface0/80 transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-lab-red shrink-0" />
              <span className="flex-1 text-left truncate text-lab-text font-medium">
                {alarm.source}
              </span>
              <span className="text-[10px] text-lab-overlay0">
                {alarm.min} – {alarm.max}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${alarm.enabled ? 'bg-lab-green/20 text-lab-green' : 'bg-lab-overlay0/20 text-lab-overlay0'}`}>
                {alarm.enabled ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeAlarm(alarm.id); }}
                className="p-1 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>

            {expanded === alarm.id && (
              <div className="px-2.5 pb-2.5 space-y-2 border-t border-lab-surface0/50">
                <div className="mt-2">
                  <label className="text-[10px] text-lab-overlay0 block mb-1">Source Variable</label>
                  <select
                    value={alarm.source}
                    onChange={(e) => updateAlarm(alarm.id, { source: e.target.value })}
                    className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                  >
                    {stateVars.map((sv) => (
                      <option key={sv.id} value={sv.name}>{sv.name} ({sv.type})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-lab-overlay0 block mb-1">Min</label>
                    <input
                      type="number"
                      value={alarm.min ?? ''}
                      onChange={(e) => updateAlarm(alarm.id, { min: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-lab-overlay0 block mb-1">Max</label>
                    <input
                      type="number"
                      value={alarm.max ?? ''}
                      onChange={(e) => updateAlarm(alarm.id, { max: e.target.value === '' ? undefined : Number(e.target.value) })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-lab-overlay0 block mb-1">Hysteresis</label>
                    <input
                      type="number"
                      value={alarm.hysteresis ?? 0}
                      onChange={(e) => updateAlarm(alarm.id, { hysteresis: Number(e.target.value) })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-lab-overlay0 block mb-1">Action</label>
                  <select
                    value={alarm.action}
                    onChange={(e) => updateAlarm(alarm.id, { action: e.target.value as IRAlarm['action'] })}
                    className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                  >
                    <option value="visual">Visual (flash widget)</option>
                    <option value="audio">Audio (beep)</option>
                    <option value="log">Log to file</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={alarm.enabled}
                    onChange={(e) => updateAlarm(alarm.id, { enabled: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-lab-blue"
                  />
                  <span className="text-[11px] text-lab-subtext0">Enabled</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
