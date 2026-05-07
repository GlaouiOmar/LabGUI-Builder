import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Trash2, FileSpreadsheet } from 'lucide-react';
import type { IRDataLogger } from '../../types/ir';

export function DataLoggerPanel() {
  const dataLoggers = useProjectStore((s) => s.document.data_loggers);
  const stateVars = useProjectStore((s) => s.document.state_variables);
  const setDocument = useProjectStore((s) => s.setDocument);
  const document = useProjectStore((s) => s.document);

  const [expanded, setExpanded] = useState<string | null>(null);

  const addDataLogger = () => {
    const dl: IRDataLogger = {
      id: nanoid(),
      sources: stateVars.length > 0 ? [stateVars[0].name] : [],
      format: 'csv',
      path: './logs/',
      interval_ms: 1000,
      max_file_size_mb: 100,
      enabled: true,
    };
    setDocument({
      ...document,
      data_loggers: [...document.data_loggers, dl],
      modified_at: new Date().toISOString(),
    });
  };

  const removeDataLogger = (id: string) => {
    setDocument({
      ...document,
      data_loggers: document.data_loggers.filter((d) => d.id !== id),
      modified_at: new Date().toISOString(),
    });
  };

  const updateDataLogger = (id: string, updates: Partial<IRDataLogger>) => {
    setDocument({
      ...document,
      data_loggers: document.data_loggers.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      modified_at: new Date().toISOString(),
    });
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-lab-text">Data Loggers</span>
        <button
          onClick={addDataLogger}
          className="p-1 rounded hover:bg-lab-surface0 text-lab-blue transition-colors"
          title="Add data logger"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {dataLoggers.length === 0 && (
        <div className="text-center text-lab-overlay0 text-xs py-4">
          <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No data loggers configured.
          <br />
          Log state variables to CSV.
        </div>
      )}

      <div className="space-y-2">
        {dataLoggers.map((dl) => (
          <div key={dl.id} className="bg-lab-surface0/50 rounded overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === dl.id ? null : dl.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-lab-surface0/80 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-lab-green shrink-0" />
              <span className="flex-1 text-left truncate text-lab-text font-medium">
                {dl.sources.join(', ')}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${dl.enabled ? 'bg-lab-green/20 text-lab-green' : 'bg-lab-overlay0/20 text-lab-overlay0'}`}>
                {dl.enabled ? 'ON' : 'OFF'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeDataLogger(dl.id); }}
                className="p-1 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>

            {expanded === dl.id && (
              <div className="px-2.5 pb-2.5 space-y-2 border-t border-lab-surface0/50">
                <div className="mt-2">
                  <label className="text-[10px] text-lab-overlay0 block mb-1">Sources (state variables)</label>
                  <div className="flex flex-wrap gap-1">
                    {stateVars.map((sv) => {
                      const selected = dl.sources.includes(sv.name);
                      return (
                        <button
                          key={sv.id}
                          onClick={() => {
                            const newSources = selected
                              ? dl.sources.filter((s) => s !== sv.name)
                              : [...dl.sources, sv.name];
                            updateDataLogger(dl.id, { sources: newSources });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                            selected
                              ? 'bg-lab-blue/20 text-lab-blue border border-lab-blue/30'
                              : 'bg-lab-base text-lab-overlay0 border border-lab-surface1 hover:text-lab-text'
                          }`}
                        >
                          {sv.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-lab-overlay0 block mb-1">Interval (ms)</label>
                    <input
                      type="number"
                      value={dl.interval_ms}
                      onChange={(e) => updateDataLogger(dl.id, { interval_ms: Number(e.target.value) })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-lab-overlay0 block mb-1">Max File (MB)</label>
                    <input
                      type="number"
                      value={dl.max_file_size_mb}
                      onChange={(e) => updateDataLogger(dl.id, { max_file_size_mb: Number(e.target.value) })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-lab-overlay0 block mb-1">Output Path</label>
                  <input
                    type="text"
                    value={dl.path}
                    onChange={(e) => updateDataLogger(dl.id, { path: e.target.value })}
                    className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={dl.enabled}
                    onChange={(e) => updateDataLogger(dl.id, { enabled: e.target.checked })}
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
