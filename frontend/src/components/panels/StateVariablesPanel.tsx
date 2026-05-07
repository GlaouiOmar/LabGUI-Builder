// import { useState } from 'react';
import { nanoid } from 'nanoid';
import { useProjectStore } from '../../stores/projectStore';
import { Plus, Trash2 } from 'lucide-react';
import type { IRStateVariable } from '../../types/ir';

export function StateVariablesPanel() {
  const stateVars = useProjectStore((s) => s.document.state_variables);
  const addStateVariable = useProjectStore((s) => s.addStateVariable);
  const removeStateVariable = useProjectStore((s) => s.removeStateVariable);
  const updateStateVariable = useProjectStore((s) => s.updateStateVariable);

  const handleAdd = () => {
    const sv: IRStateVariable = {
      id: nanoid(),
      name: `var_${stateVars.length + 1}`,
      type: 'string',
      default_value: '',
    };
    addStateVariable(sv);
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-lab-text">State Variables</span>
        <button
          onClick={handleAdd}
          className="p-1 rounded hover:bg-lab-surface0 text-lab-blue transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {stateVars.length === 0 && (
        <div className="text-center text-lab-overlay0 text-xs py-4">
          No state variables defined.
          <br />
          Add variables to bind widget values.
        </div>
      )}

      <div className="space-y-2">
        {stateVars.map((sv) => (
          <div key={sv.id} className="bg-lab-surface0/50 rounded p-2 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <input
                value={sv.name}
                onChange={(e) => updateStateVariable(sv.id, { name: e.target.value })}
                className="flex-1 min-w-0 bg-lab-base text-lab-text text-xs rounded px-1.5 py-1 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
              />
              <button
                onClick={() => removeStateVariable(sv.id)}
                className="p-1 rounded hover:bg-lab-red/20 text-lab-red transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <div className="flex gap-1.5">
              <select
                value={sv.type}
                onChange={(e) => updateStateVariable(sv.id, { type: e.target.value as any })}
                className="bg-lab-base text-lab-text text-xs rounded px-1.5 py-1 border border-lab-surface1 outline-none focus:border-lab-blue"
              >
                <option value="string">String</option>
                <option value="int">Int</option>
                <option value="float">Float</option>
                <option value="bool">Bool</option>
              </select>
              <input
                value={String(sv.default_value)}
                onChange={(e) => {
                  let val: string | number | boolean = e.target.value;
                  if (sv.type === 'int') val = parseInt(e.target.value) || 0;
                  if (sv.type === 'float') val = parseFloat(e.target.value) || 0;
                  if (sv.type === 'bool') val = e.target.value === 'true';
                  updateStateVariable(sv.id, { default_value: val });
                }}
                className="flex-1 min-w-0 bg-lab-base text-lab-text text-xs rounded px-1.5 py-1 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
              />
            </div>
            <input
              placeholder="Format (e.g. %.2f V)"
              value={sv.format || ''}
              onChange={(e) => updateStateVariable(sv.id, { format: e.target.value })}
              className="w-full bg-lab-base text-lab-text text-xs rounded px-1.5 py-1 border border-lab-surface1 outline-none focus:border-lab-blue font-mono"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
