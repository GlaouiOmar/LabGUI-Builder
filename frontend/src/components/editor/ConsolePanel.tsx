import { useState, useEffect, useRef, useCallback } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { generateTkinterCode } from '../../generator/tkinterGenerator';
import { Terminal, Play, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

interface LogEntry {
  id: number;
  type: 'stdout' | 'stderr' | 'info' | 'error' | 'success';
  text: string;
  timestamp: Date;
}

type PyodideInstance = {
  runPythonAsync: (code: string) => Promise<unknown>;
  setStdout: (callback: (text: string) => void) => void;
  setStderr: (callback: (text: string) => void) => void;
  isPyProxy: (obj: unknown) => boolean;
  pyimport: (name: string) => unknown;
  loadPackage: (name: string) => Promise<void>;
};

let pyodidePromise: Promise<PyodideInstance> | null = null;

async function loadPyodideInstance(): Promise<PyodideInstance> {
  if (pyodidePromise) return pyodidePromise;

  pyodidePromise = (async () => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
    script.async = true;

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide'));
      document.head.appendChild(script);
    });

    // @ts-expect-error loadPyodide is injected by the script
    const instance: PyodideInstance = await window.loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/',
    });

    return instance;
  })();

  return pyodidePromise;
}

export function ConsolePanel() {
  const document = useProjectStore((s) => s.document);

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [pyodide, setPyodide] = useState<PyodideInstance | null>(null);
  const [initing, setIniting] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((type: LogEntry['type'], text: string) => {
    const id = ++logIdRef.current;
    setLogs((prev) => [...prev, { id, type, text, timestamp: new Date() }]);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const initPyodide = useCallback(async () => {
    if (pyodide || initing) return;
    setIniting(true);
    setError(null);
    try {
      addLog('info', 'Loading Pyodide (CPython in WebAssembly)...');
      const instance = await loadPyodideInstance();
      addLog('success', 'Pyodide loaded successfully. Python ' + (await instance.runPythonAsync('import sys; sys.version')));
      setPyodide(instance);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load Pyodide');
      addLog('error', 'Failed to load Pyodide: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIniting(false);
    }
  }, [pyodide, initing, addLog]);

  const runCode = useCallback(async () => {
    if (!pyodide) {
      await initPyodide();
      return;
    }

    const code = generateTkinterCode(document);
    setRunning(true);
    setError(null);
    addLog('info', '─'.repeat(40));
    addLog('info', 'Executing generated Python code...');

    try {
      // Redirect stdout/stderr
      const stdoutLines: string[] = [];
      const stderrLines: string[] = [];

      pyodide.setStdout((text: string) => {
        stdoutLines.push(text);
        addLog('stdout', text);
      });
      pyodide.setStderr((text: string) => {
        stderrLines.push(text);
        addLog('stderr', text);
      });

      // Patch tkinter to prevent actual GUI creation in browser
      await pyodide.runPythonAsync(`
import sys
class FakeTk:
    def __init__(self, *args, **kwargs): pass
    def title(self, *args): pass
    def geometry(self, *args): pass
    def mainloop(self): pass
    def configure(self, **kwargs): pass
    def after(self, *args): pass
    def bell(self): pass

class FakeTtk:
    class Style:
        def theme_use(self, *args): pass

class FakeWidget:
    def __init__(self, *args, **kwargs): pass
    def place(self, **kwargs): pass
    def grid(self, **kwargs): pass
    def config(self, **kwargs): pass
    def __setitem__(self, key, value): pass

import tkinter
tkinter.Tk = FakeTk
tkinter.Tcl = FakeTk
tkinter.Frame = FakeWidget
tkinter.Button = FakeWidget
tkinter.Label = FakeWidget
tkinter.Entry = FakeWidget
tkinter.Scale = FakeWidget
tkinter.Checkbutton = FakeWidget
tkinter.Radiobutton = FakeWidget
tkinter.Listbox = FakeWidget
tkinter.Text = FakeWidget
tkinter.Canvas = FakeWidget
tkinter.Misc = FakeWidget

import tkinter.ttk as ttk
ttk.Style = FakeTtk.Style
ttk.Combobox = FakeWidget
ttk.Notebook = FakeWidget
ttk.Spinbox = FakeWidget
ttk.Scale = FakeWidget

# Patch pyvisa and serial if imported
import types
sys.modules['pyvisa'] = types.ModuleType('pyvisa')
sys.modules['pyvisa'].ResourceManager = lambda: None
sys.modules['serial'] = types.ModuleType('serial')
sys.modules['serial'].Serial = lambda *args, **kwargs: None
`);

      // Run user code
      await pyodide.runPythonAsync(code);

      addLog('success', 'Execution completed successfully.');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      addLog('error', msg);
      setError(msg);
    } finally {
      setRunning(false);
    }
  }, [pyodide, document, addLog, initPyodide]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setError(null);
  }, []);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-lab-surface0">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-lab-green" />
          <span className="text-xs font-medium text-lab-text">Python Console</span>
          {pyodide && (
            <span className="w-1.5 h-1.5 rounded-full bg-lab-green animate-pulse" />
          )}
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-[10px] text-lab-red" title={error}>
              Error
            </span>
          )}
          <button
            onClick={clearLogs}
            className="p-1.5 rounded hover:bg-lab-surface0 text-lab-subtext0 hover:text-lab-text transition-colors"
            title="Clear console"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={runCode}
            disabled={running || initing}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-lab-green text-lab-crust text-[11px] font-medium hover:bg-lab-green/80 transition-colors disabled:opacity-40"
          >
            {running || initing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {initing ? 'Loading...' : running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Console output */}
      <div className="flex-1 overflow-auto bg-lab-crust p-3 font-mono text-[11px] space-y-1">
        {logs.length === 0 && !initing && (
          <div className="text-center text-lab-overlay0 mt-8">
            <Terminal className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <div className="text-xs">Click <strong>Run</strong> to execute generated Python code.</div>
            <div className="text-[10px] mt-1 opacity-60">
              Pyodide runs CPython in your browser via WebAssembly.
            </div>
            <div className="text-[10px] mt-1 opacity-60">
              tkinter GUI calls are mocked — only logic and stdout are executed.
            </div>
          </div>
        )}

        {logs.map((log) => (
          <div
            key={log.id}
            className={`flex gap-2 ${
              log.type === 'error'
                ? 'text-lab-red'
                : log.type === 'stderr'
                ? 'text-lab-yellow'
                : log.type === 'success'
                ? 'text-lab-green'
                : log.type === 'info'
                ? 'text-lab-overlay0'
                : 'text-lab-text'
            }`}
          >
            <span className="text-lab-surface2 shrink-0 select-none">
              {log.timestamp.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className="shrink-0">
              {log.type === 'error' && <AlertCircle className="w-3 h-3 inline mr-1" />}
              {log.type === 'success' && <CheckCircle className="w-3 h-3 inline mr-1" />}
              {log.type === 'stdout' && <span className="text-lab-blue mr-1">›</span>}
              {log.type === 'stderr' && <span className="text-lab-yellow mr-1">⚠</span>}
              {log.type === 'info' && <span className="text-lab-overlay0 mr-1">ℹ</span>}
            </span>
            <span className="whitespace-pre-wrap break-all">{log.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
