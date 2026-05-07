import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { Trash2, Cable } from 'lucide-react';
import type { IRInstrument } from '../../types/ir';

export function InstrumentsPanel() {
  const instruments = useProjectStore((s) => s.document.instruments);
  const addInstrument = useProjectStore((s) => s.addInstrument);
  const removeInstrument = useProjectStore((s) => s.removeInstrument);
  const updateInstrument = useProjectStore((s) => s.updateInstrument);

  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAdd = (protocol: 'visa' | 'serial') => {
    const inst: IRInstrument = {
      id: nanoid(),
      name: `inst_${instruments.length + 1}`,
      protocol,
      config: protocol === 'visa'
        ? { resource_string: 'GPIB0::22::INSTR', timeout_ms: 5000 }
        : { port: 'COM1', baudrate: 9600 },
      commands: [],
    };
    addInstrument(inst);
    setExpanded(inst.id);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-lab-text">Instruments</span>
        <div className="flex gap-1">
          <button
            onClick={() => handleAdd('visa')}
            className="px-2 py-1 rounded bg-lab-surface0 text-lab-blue text-[10px] font-medium hover:bg-lab-surface1 transition-colors"
          >
            + VISA
          </button>
          <button
            onClick={() => handleAdd('serial')}
            className="px-2 py-1 rounded bg-lab-surface0 text-lab-blue text-[10px] font-medium hover:bg-lab-surface1 transition-colors"
          >
            + Serial
          </button>
        </div>
      </div>

      {instruments.length === 0 && (
        <div className="text-center text-lab-overlay0 text-xs py-4">
          <Cable className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No instruments configured.
          <br />
          Add VISA or Serial connections.
        </div>
      )}

      <div className="space-y-2">
        {instruments.map((inst) => (
          <div key={inst.id} className="bg-lab-surface0/50 rounded overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === inst.id ? null : inst.id)}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs hover:bg-lab-surface0/80 transition-colors"
            >
              <Cable className="w-3.5 h-3.5 text-lab-blue shrink-0" />
              <span className="flex-1 text-left truncate text-lab-text font-medium">{inst.name}</span>
              <span className="text-[10px] text-lab-overlay0 uppercase">{inst.protocol}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeInstrument(inst.id); }}
                className="p-1 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </button>

            {expanded === inst.id && (
              <div className="px-2.5 pb-2.5 space-y-2 border-t border-lab-surface0/50">
                <input
                  value={inst.name}
                  onChange={(e) => updateInstrument(inst.id, { name: e.target.value })}
                  className="w-full mt-2 bg-lab-base text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
                  placeholder="Instrument name"
                />
                {inst.protocol === 'visa' && (
                  <>
                    <label className="text-[10px] text-lab-overlay0">Resource String</label>
                    <input
                      value={inst.config.resource_string as string}
                      onChange={(e) => updateInstrument(inst.id, { config: { ...inst.config, resource_string: e.target.value } })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
                      placeholder="GPIB0::22::INSTR"
                    />
                  </>
                )}
                {inst.protocol === 'serial' && (
                  <>
                    <label className="text-[10px] text-lab-overlay0">Port</label>
                    <input
                      value={inst.config.port as string}
                      onChange={(e) => updateInstrument(inst.id, { config: { ...inst.config, port: e.target.value } })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
                      placeholder="COM1"
                    />
                    <label className="text-[10px] text-lab-overlay0">Baudrate</label>
                    <input
                      type="number"
                      value={inst.config.baudrate as number}
                      onChange={(e) => updateInstrument(inst.id, { config: { ...inst.config, baudrate: Number(e.target.value) } })}
                      className="w-full bg-lab-base text-lab-text text-xs rounded px-2 py-1.5 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
                    />
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
