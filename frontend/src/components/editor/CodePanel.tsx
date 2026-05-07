import { useMemo } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateCode, BACKEND_LABELS } from '../../generator';

export function CodePanel() {
  const document = useProjectStore((s) => s.document);
  const backend = document.settings.codegen_backend || 'tkinter';

  const code = useMemo(() => generateCode(document, backend), [document, backend]);

  return (
    <div className="h-full flex flex-col bg-lab-crust">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-lab-surface0">
        <span className="text-[10px] text-lab-overlay0 font-mono">
          Generated Python / {BACKEND_LABELS[backend]}
        </span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
          }}
          className="text-[10px] text-lab-blue hover:text-lab-blueLight transition-colors"
        >
          Copy
        </button>
      </div>
      <pre className="flex-1 overflow-auto p-3 text-[11px] font-mono text-lab-subtext0 leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}
