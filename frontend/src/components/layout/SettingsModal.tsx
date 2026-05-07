import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useProjectStore } from '../../stores/projectStore';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useProjectStore((s) => s.document.settings);
  const updateSettings = useProjectStore((s) => s.updateSettings);

  const [form, setForm] = useState({ ...settings });

  useEffect(() => {
    if (open) setForm({ ...settings });
  }, [open, settings]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-96 bg-lab-mantle border border-lab-surface0 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-lab-surface0">
          <h2 className="text-sm font-semibold text-lab-text">Project Settings</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-lab-surface0 text-lab-subtext0 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-[11px] font-medium text-lab-subtext0 mb-1">Window Title</label>
            <input
              type="text"
              value={form.window_title}
              onChange={(e) => setForm((f) => ({ ...f, window_title: e.target.value }))}
              className="w-full bg-lab-base text-lab-text text-xs rounded px-2.5 py-2 border border-lab-surface1 outline-none focus:border-lab-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-lab-subtext0 mb-1">Window Width</label>
              <input
                type="number"
                value={form.window_width}
                onChange={(e) => setForm((f) => ({ ...f, window_width: Number(e.target.value) }))}
                className="w-full bg-lab-base text-lab-text text-xs rounded px-2.5 py-2 border border-lab-surface1 outline-none focus:border-lab-blue"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-lab-subtext0 mb-1">Window Height</label>
              <input
                type="number"
                value={form.window_height}
                onChange={(e) => setForm((f) => ({ ...f, window_height: Number(e.target.value) }))}
                className="w-full bg-lab-base text-lab-text text-xs rounded px-2.5 py-2 border border-lab-surface1 outline-none focus:border-lab-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-lab-subtext0 mb-1">tkinter Theme</label>
            <select
              value={form.theme}
              onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))}
              className="w-full bg-lab-base text-lab-text text-xs rounded px-2.5 py-2 border border-lab-surface1 outline-none focus:border-lab-blue"
            >
              <option value="clam">clam</option>
              <option value="alt">alt</option>
              <option value="default">default</option>
              <option value="classic">classic</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-lab-subtext0 mb-1">Code Generator Backend</label>
            <select
              value={form.codegen_backend || 'tkinter'}
              onChange={(e) => setForm((f) => ({ ...f, codegen_backend: e.target.value as any }))}
              className="w-full bg-lab-base text-lab-text text-xs rounded px-2.5 py-2 border border-lab-surface1 outline-none focus:border-lab-blue"
            >
              <option value="tkinter">tkinter (standard)</option>
              <option value="pyqt6">PyQt6</option>
              <option value="pyside6">PySide6</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-lab-subtext0 hover:bg-lab-surface0 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium bg-lab-blue text-lab-crust hover:bg-lab-blueLight transition-colors"
            >
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
