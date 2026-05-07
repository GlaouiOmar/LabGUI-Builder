import type { IRDocument, IRNode, IRStateVariable, IRInstrument, IRDataLogger, IRAlarm } from '../types/ir';

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^\d/, '_$&');
}

function indent(level: number): string {
  return '    '.repeat(level);
}

function styleToTkConfig(style: IRNode['style']): string {
  if (!style) return '';
  const parts: string[] = [];
  if (style.bg) parts.push(`bg="${style.bg}"`);
  if (style.fg) parts.push(`fg="${style.fg}"`);
  if (style.font_family && style.font_size) {
    if (style.font_weight === 'bold') {
      parts.push(`font=("${style.font_family}", ${style.font_size}, "bold")`);
    } else {
      parts.push(`font=("${style.font_family}", ${style.font_size})`);
    }
  }
  if (style.border_width !== undefined) parts.push(`bd=${style.border_width}`);
  if (style.border_color) parts.push(`highlightbackground="${style.border_color}"`);
  if (style.relief) parts.push(`relief="${style.relief}"`);
  return parts.join(', ');
}

function emitWidget(
  node: IRNode,
  parentVar: string,
  level: number,
  isRoot: boolean = false,
  windowWidth?: number,
  windowHeight?: number
): string[] {
  // Custom HTML widgets are not renderable in tkinter; emit a placeholder
  if (node.type === 'Custom') {
    const varName = sanitizeName(node.name);
    return [
      `${indent(level)}# Custom widget "${node.name}" (HTML/CSS/JS — not renderable in tkinter)`,
      `${indent(level)}self.${varName} = tk.Label(${parentVar}, text="[Custom: ${node.abstract_props.label || node.name}]", bg="#313244", fg="#cdd6f4")`,
      `${indent(level)}self.${varName}.place(x=${Math.round(node.geometry.x)}, y=${Math.round(node.geometry.y)}, width=${Math.round(node.geometry.w)}, height=${Math.round(node.geometry.h)})`,
    ];
  }

  const varName = sanitizeName(node.name);
  const tkType = node.type === 'GridContainer' ? 'Frame' : node.type;
  const isTtk = ['Combobox', 'Notebook', 'Scale', 'Spinbox', 'Progressbar', 'Treeview', 'Separator'].includes(node.type);
  const prefix = isTtk ? 'ttk.' : 'tk.';

  let lines: string[] = [];
  let cfg = styleToTkConfig(node.style);

  if (node.type === 'LabelFrame' && node.abstract_props.label) {
    cfg += (cfg ? ', ' : '') + `text="${node.abstract_props.label}"`;
  }

  // OptionMenu has a different constructor signature
  if (node.type === 'OptionMenu') {
    const values = (node.widget_props?.values as string[] | undefined) ?? ['Option 1', 'Option 2'];
    const varName2 = sanitizeName(node.widget_props?.variable as string || `${node.name}_var`);
    lines.push(`${indent(level)}self.${varName2} = tk.StringVar(value="${values[0]}")`);
    lines.push(`${indent(level)}self.${varName} = tk.OptionMenu(${parentVar}, self.${varName2}, ${values.map((v: string) => `"${v}"`).join(', ')})`);
  } else {
    const constructorArgs = cfg ? `${parentVar}, ${cfg}` : parentVar;
    lines.push(`${indent(level)}self.${varName} = ${prefix}${tkType}(${constructorArgs})`);
  }

  if (isRoot) {
    lines.push(
      `${indent(level)}self.${varName}.place(x=0, y=0, width=${windowWidth ?? 800}, height=${windowHeight ?? 600})`
    );
  } else if (node.type === 'GridContainer') {
    const gp = node.widget_props as { rows?: number; cols?: number; padx?: number; pady?: number } | undefined;
    lines.push(`${indent(level)}self.${varName}.grid(row=0, column=0, sticky="nsew")`);
    if (gp?.padx !== undefined) {
      lines.push(`${indent(level)}self.${varName}.grid_configure(padx=${gp.padx}, pady=${gp.pady})`);
    }
  } else {
    lines.push(
      `${indent(level)}self.${varName}.place(x=${Math.round(node.geometry.x)}, y=${Math.round(node.geometry.y)}, ` +
      `width=${Math.round(node.geometry.w)}, height=${Math.round(node.geometry.h)})`
    );
  }

  if (node.type === 'Button' || node.type === 'Label') {
    if (node.abstract_props.label) {
      lines.push(`${indent(level)}self.${varName}.config(text="${node.abstract_props.label}")`);
    }
  }
  if (node.type === 'Entry') {
    if (node.widget_props?.textvariable) {
      lines.push(`${indent(level)}self.${varName}.config(textvariable=self.${String(node.widget_props.textvariable)})`);
    }
  }
  if (node.type === 'Scale') {
    const min = node.widget_props?.from ?? 0;
    const max = node.widget_props?.to ?? 100;
    const orient = node.widget_props?.orient ?? 'horizontal';
    lines.push(`${indent(level)}self.${varName}.config(from_=${min}, to=${max}, orient=tk.${orient.toString().toUpperCase()})`);
  }
  if (node.type === 'Combobox') {
    const values = node.widget_props?.values as string[] | undefined;
    if (values && values.length > 0) {
      lines.push(`${indent(level)}self.${varName}['values'] = ${JSON.stringify(values)}`);
    }
  }
  if (node.type === 'Spinbox') {
    const min = node.widget_props?.from ?? 0;
    const max = node.widget_props?.to ?? 100;
    lines.push(`${indent(level)}self.${varName}.config(from_=${min}, to=${max})`);
  }
  if (node.type === 'Checkbutton' || node.type === 'Radiobutton') {
    if (node.abstract_props.label) {
      lines.push(`${indent(level)}self.${varName}.config(text="${node.abstract_props.label}")`);
    }
    if (node.widget_props?.variable) {
      lines.push(`${indent(level)}self.${varName}.config(variable=self.${String(node.widget_props.variable)})`);
    }
  }
  if (node.type === 'Progressbar') {
    const orient = node.widget_props?.orient ?? 'horizontal';
    const mode = node.widget_props?.mode ?? 'determinate';
    const max = node.widget_props?.maximum ?? 100;
    lines.push(`${indent(level)}self.${varName}.config(orient=tk.${orient.toString().toUpperCase()}, mode="${mode}", maximum=${max})`);
  }
  if (node.type === 'Treeview') {
    const columns = (node.widget_props?.columns as string[] | undefined) ?? ['Column 1', 'Column 2'];
    lines.push(`${indent(level)}self.${varName}['columns'] = ${JSON.stringify(columns)}`);
    for (const col of columns) {
      lines.push(`${indent(level)}self.${varName}.heading("${col}", text="${col}")`);
      lines.push(`${indent(level)}self.${varName}.column("${col}", width=100)`);
    }
  }
  if (node.type === 'Separator') {
    const orient = node.widget_props?.orient ?? 'horizontal';
    lines.push(`${indent(level)}self.${varName}.config(orient=tk.${orient.toString().toUpperCase()})`);
  }
  if (node.type === 'Scrollbar') {
    const orient = node.widget_props?.orient ?? 'vertical';
    lines.push(`${indent(level)}self.${varName}.config(orient=tk.${orient.toString().toUpperCase()})`);
  }
  for (const ev of node.events) {
    if (ev.name === 'on_click' && ev.inline_code) {
      lines.push(`${indent(level)}self.${varName}.config(command=self._on_${varName}_click)`);
    }
  }

  for (const child of node.children) {
    lines.push(...emitWidget(child, `self.${varName}`, level));
  }

  return lines;
}

function emitStateVariables(variables: IRStateVariable[]): string[] {
  if (variables.length === 0) return [];
  const lines: string[] = [''];
  lines.push('        # State variables');
  for (const sv of variables) {
    const varType =
      sv.type === 'float' ? 'tk.DoubleVar' :
      sv.type === 'int' ? 'tk.IntVar' :
      sv.type === 'bool' ? 'tk.BooleanVar' : 'tk.StringVar';
    const defaultVal =
      sv.type === 'bool' ? (sv.default_value ? 'True' : 'False') :
      typeof sv.default_value === 'string' ? `"${sv.default_value}"` : sv.default_value;
    lines.push(`        self.${sanitizeName(sv.name)} = ${varType}(value=${defaultVal})`);
  }
  return lines;
}

function emitInstrumentConnection(inst: IRInstrument): string[] {
  const lines: string[] = [];
  const varName = sanitizeName(inst.name);
  lines.push(`        # Instrument: ${inst.name}`);
  if (inst.protocol === 'visa') {
    const resource = inst.config.resource_string as string;
    lines.push(`        self.${varName} = self.rm.open_resource("${resource}")`);
  } else if (inst.protocol === 'serial') {
    const port = inst.config.port as string;
    const baud = inst.config.baudrate as number ?? 9600;
    lines.push(`        self.${varName} = serial.Serial("${port}", ${baud}, timeout=1)`);
  }
  return lines;
}

function emitEventHandlers(root: IRNode): string[] {
  const handlers: string[] = [];
  function visit(node: IRNode) {
    const varName = sanitizeName(node.name);
    for (const ev of node.events) {
      if (ev.name === 'on_click' && ev.inline_code) {
        handlers.push(`    def _on_${varName}_click(self):`);
        handlers.push(`        """${node.abstract_props.label || node.name} click handler."""`);
        for (const line of ev.inline_code.split('\n')) {
          handlers.push(`        ${line}`);
        }
        handlers.push('');
      }
    }
    for (const child of node.children) visit(child);
  }
  visit(root);
  return handlers;
}

function emitDataLoggerHelpers(): string[] {
  return [
    '',
    '',
    'class DataLogger:',
    '    """Threaded CSV data logger with rotation."""',
    '    def __init__(self, app, sources, path="./logs/", interval_ms=1000, max_file_size_mb=100):',
    '        self.app = app',
    '        self.sources = sources',
    '        self.path = pathlib.Path(path)',
    '        self.path.mkdir(parents=True, exist_ok=True)',
    '        self.interval = interval_ms / 1000.0',
    '        self.max_size = max_file_size_mb * 1024 * 1024',
    '        self._running = False',
    '        self._thread = None',
    '        self._file = None',
    '        self._writer = None',
    '        self._file_index = 0',
    '',
    '    def _open_file(self):',
    '        if self._file:',
    '            self._file.close()',
    '        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")',
    '        filename = self.path / f"log_{timestamp}_{self._file_index:03d}.csv"',
    '        self._file = open(filename, "w", newline="")',
    '        self._writer = csv.writer(self._file)',
    '        self._writer.writerow(["timestamp"] + self.sources)',
    '        self._file_index += 1',
    '',
    '    def _loop(self):',
    '        self._open_file()',
    '        while self._running:',
    '            time.sleep(self.interval)',
    '            if not self._running:',
    '                break',
    '            row = [datetime.datetime.now().isoformat()]',
    '            for src in self.sources:',
    '                val = getattr(self.app, src, None)',
    '                if hasattr(val, "get"):',
    '                    row.append(val.get())',
    '                else:',
    '                    row.append(val)',
    '            self._writer.writerow(row)',
    '            self._file.flush()',
    '            if self._file.tell() > self.max_size:',
    '                self._open_file()',
    '',
    '    def start(self):',
    '        self._running = True',
    '        self._thread = threading.Thread(target=self._loop, daemon=True)',
    '        self._thread.start()',
    '',
    '    def stop(self):',
    '        self._running = False',
    '        if self._thread:',
    '            self._thread.join(timeout=2.0)',
    '        if self._file:',
    '            self._file.close()',
    '',
  ];
}

function emitAlarmHelpers(): string[] {
  return [
    '',
    '',
    'class AlarmMonitor:',
    '    """Threaded alarm threshold monitor with hysteresis."""',
    '    def __init__(self, app, source, min_val=None, max_val=None, hysteresis=1.0, action="visual"):',
    '        self.app = app',
    '        self.source = source',
    '        self.min_val = min_val',
    '        self.max_val = max_val',
    '        self.hysteresis = hysteresis',
    '        self.action = action',
    '        self._running = False',
    '        self._thread = None',
    '        self._state = "normal"  # normal, alarm',
    '',
    '    def _read(self):',
    '        val = getattr(self.app, self.source, None)',
    '        if hasattr(val, "get"):',
    '            return val.get()',
    '        return val',
    '',
    '    def _check(self, value):',
    '        if self._state == "normal":',
    '            if (self.min_val is not None and value < self.min_val) or (self.max_val is not None and value > self.max_val):',
    '                return "alarm"',
    '        else:',
    '            if (self.min_val is not None and value > self.min_val + self.hysteresis) and (self.max_val is not None and value < self.max_val - self.hysteresis):',
    '                return "normal"',
    '            if self.min_val is None and self.max_val is not None and value < self.max_val - self.hysteresis:',
    '                return "normal"',
    '            if self.max_val is None and self.min_val is not None and value > self.min_val + self.hysteresis:',
    '                return "normal"',
    '        return self._state',
    '',
    '    def _loop(self):',
    '        while self._running:',
    '            time.sleep(0.5)',
    '            if not self._running:',
    '                break',
    '            try:',
    '                value = self._read()',
    '                new_state = self._check(value)',
    '                if new_state != self._state:',
    '                    self._state = new_state',
    '                    self.app.root.after(0, lambda: self._trigger(new_state, value))',
    '            except Exception:',
    '                pass',
    '',
    '    def _trigger(self, state, value):',
    '        if state == "alarm":',
    '            print(f"[ALARM] {self.source} = {value} (min={self.min_val}, max={self.max_val})")',
    '            if self.action == "visual":',
    '                self.app.root.configure(bg="red")',
    '            elif self.action == "audio":',
    '                self.app.root.bell()',
    '        else:',
    '            print(f"[ALARM CLEARED] {self.source}")',
    '            if self.action == "visual":',
    '                self.app.root.configure(bg="")',
    '',
    '    def start(self):',
    '        self._running = True',
    '        self._thread = threading.Thread(target=self._loop, daemon=True)',
    '        self._thread.start()',
    '',
    '    def stop(self):',
    '        self._running = False',
    '        if self._thread:',
    '            self._thread.join(timeout=2.0)',
    '',
  ];
}

function emitDataLoggerInit(loggers: IRDataLogger[]): string[] {
  if (loggers.length === 0) return [];
  const lines: string[] = [''];
  lines.push('        # Data loggers');
  lines.push('        self._data_loggers = []');
  for (const dl of loggers) {
    if (!dl.enabled) continue;
    const id = sanitizeName(`logger_${dl.id.slice(0, 4)}`);
    lines.push(`        self.${id} = DataLogger(`);
    lines.push(`            self,`);
    lines.push(`            sources=${JSON.stringify(dl.sources)},`);
    lines.push(`            path="${dl.path}",`);
    lines.push(`            interval_ms=${dl.interval_ms},`);
    lines.push(`            max_file_size_mb=${dl.max_file_size_mb}`);
    lines.push(`        )`);
    lines.push(`        self.${id}.start()`);
    lines.push(`        self._data_loggers.append(self.${id})`);
  }
  return lines;
}

function emitAlarmInit(alarms: IRAlarm[]): string[] {
  if (alarms.length === 0) return [];
  const lines: string[] = [''];
  lines.push('        # Alarm monitors');
  lines.push('        self._alarm_monitors = []');
  for (const al of alarms) {
    if (!al.enabled) continue;
    const id = sanitizeName(`alarm_${al.id.slice(0, 4)}`);
    lines.push(`        self.${id} = AlarmMonitor(`);
    lines.push(`            self,`);
    lines.push(`            source="${al.source}",`);
    if (al.min !== undefined) lines.push(`            min_val=${al.min},`);
    if (al.max !== undefined) lines.push(`            max_val=${al.max},`);
    lines.push(`            hysteresis=${al.hysteresis ?? 1.0},`);
    lines.push(`            action="${al.action}"`);
    lines.push(`        )`);
    lines.push(`        self.${id}.start()`);
    lines.push(`        self._alarm_monitors.append(self.${id})`);
  }
  return lines;
}

function emitCleanupMethods(doc: IRDocument): string[] {
  const lines: string[] = [];
  const hasLoggers = doc.data_loggers.some((d) => d.enabled);
  const hasAlarms = doc.alarms.some((a) => a.enabled);

  if (hasLoggers || hasAlarms || doc.instruments.length > 0) {
    lines.push('');
    lines.push('    def cleanup(self):');
    lines.push('        """Gracefully shutdown threads and close connections."""');
    if (hasLoggers) {
      lines.push('        for logger in self._data_loggers:');
      lines.push('            logger.stop()');
    }
    if (hasAlarms) {
      lines.push('        for alarm in self._alarm_monitors:');
      lines.push('            alarm.stop()');
    }
    for (const inst of doc.instruments) {
      const varName = sanitizeName(inst.name);
      lines.push(`        try: self.${varName}.close()`);
      lines.push(`        except Exception: pass`);
    }
    if (doc.instruments.some((i) => i.protocol === 'visa')) {
      lines.push(`        try: self.rm.close()`);
      lines.push(`        except Exception: pass`);
    }
    lines.push('');
    lines.push('    def run(self):');
    lines.push('        try:');
    lines.push('            self.root.mainloop()');
    lines.push('        finally:');
    lines.push('            self.cleanup()');
  } else {
    lines.push('');
    lines.push('    def run(self):');
    lines.push('        self.root.mainloop()');
  }
  return lines;
}

export function generateTkinterCode(doc: IRDocument): string {
  const root = doc.root;
  const settings = doc.settings;

  const needsThreading = doc.data_loggers.some((d) => d.enabled) || doc.alarms.some((a) => a.enabled);
  const needsPathlib = doc.data_loggers.some((d) => d.enabled);
  const needsDatetime = doc.data_loggers.some((d) => d.enabled);
  const needsCsv = doc.data_loggers.some((d) => d.enabled);
  const needsTime = doc.data_loggers.some((d) => d.enabled) || doc.alarms.some((a) => a.enabled);

  const lines: string[] = [];
  lines.push(`"""`);
  lines.push(`Auto-generated tkinter GUI — ${doc.project_name}`);
  lines.push(`Generated by LabGUI Builder on ${new Date().toISOString()}`);
  lines.push(`"""`);
  lines.push('');
  lines.push('import tkinter as tk');
  lines.push('from tkinter import ttk');
  if (needsThreading) lines.push('import threading');
  if (needsTime) lines.push('import time');
  if (needsDatetime) lines.push('import datetime');
  if (needsCsv) lines.push('import csv');
  if (needsPathlib) lines.push('import pathlib');

  if (doc.instruments.length > 0) {
    const needsVISA = doc.instruments.some((i) => i.protocol === 'visa');
    const needsSerial = doc.instruments.some((i) => i.protocol === 'serial');
    if (needsVISA) lines.push('import pyvisa');
    if (needsSerial) lines.push('import serial');
  }

  // Data logger helper class
  if (doc.data_loggers.some((d) => d.enabled)) {
    lines.push(...emitDataLoggerHelpers());
  }

  // Alarm helper class
  if (doc.alarms.some((a) => a.enabled)) {
    lines.push(...emitAlarmHelpers());
  }

  lines.push('');
  lines.push('');
  lines.push(`class ${sanitizeName(doc.project_name).replace(/\s+/g, '')}App:`);
  lines.push('    def __init__(self, root: tk.Tk):');
  lines.push('        self.root = root');
  lines.push(`        self.root.title("${settings.window_title}")`);
  lines.push(`        self.root.geometry("${settings.window_width}x${settings.window_height}")`);

  // Apply ttk theme
  if (settings.theme && settings.theme !== 'default') {
    lines.push('');
    lines.push('        # Apply ttk theme');
    lines.push(`        self._style = ttk.Style()`);
    lines.push(`        self._style.theme_use("${settings.theme}")`);
  }

  lines.push('');

  // State variables
  lines.push(...emitStateVariables(doc.state_variables));

  // Instruments
  if (doc.instruments.length > 0) {
    lines.push('');
    lines.push('        # Instrument connections');
    const needsVISA = doc.instruments.some((i) => i.protocol === 'visa');
    if (needsVISA) {
      lines.push('        self.rm = pyvisa.ResourceManager()');
    }
    for (const inst of doc.instruments) {
      lines.push(...emitInstrumentConnection(inst));
    }
  }

  // Data loggers
  lines.push(...emitDataLoggerInit(doc.data_loggers));

  // Alarms
  lines.push(...emitAlarmInit(doc.alarms));

  // Build UI
  lines.push('');
  lines.push('        # Build UI');
  lines.push(...emitWidget(root, 'root', 2, true, settings.window_width, settings.window_height));

  // Event handlers
  const handlers = emitEventHandlers(root);
  if (handlers.length > 0) {
    lines.push('');
    lines.push(...handlers);
  }

  // Cleanup + run
  lines.push(...emitCleanupMethods(doc));
  lines.push('');

  // Main
  lines.push('');
  lines.push('if __name__ == "__main__":');
  lines.push('    root = tk.Tk()');
  lines.push(`    app = ${sanitizeName(doc.project_name).replace(/\s+/g, '')}App(root)`);
  lines.push('    try:');
  lines.push('        app.run()');
  lines.push('    except KeyboardInterrupt:');
  lines.push('        app.cleanup()');
  lines.push('');

  return lines.join('\n');
}
