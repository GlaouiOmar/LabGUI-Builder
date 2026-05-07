import type { IRDocument, IRNode, IRStateVariable, IRInstrument, IRDataLogger, IRAlarm } from '../types/ir';
import type { CodeGenerator } from './interface';

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, '_').replace(/^\d/, '_$&');
}

function indent(level: number): string {
  return '    '.repeat(level);
}

function styleToQtStyleSheet(style: IRNode['style']): string {
  if (!style) return '';
  const parts: string[] = [];
  if (style.bg) parts.push(`background-color: ${style.bg};`);
  if (style.fg) parts.push(`color: ${style.fg};`);
  if (style.font_family && style.font_size) {
    const weight = style.font_weight === 'bold' ? 'bold' : 'normal';
    parts.push(`font: ${weight} ${style.font_size}pt "${style.font_family}";`);
  }
  if (style.border_width !== undefined && style.border_color) {
    parts.push(`border: ${style.border_width}px solid ${style.border_color};`);
  }
  if (style.border_radius !== undefined) {
    parts.push(`border-radius: ${style.border_radius}px;`);
  }
  return parts.join(' ');
}

function qtWidgetClass(type: IRNode['type']): string {
  const map: Record<string, string> = {
    Button: 'QPushButton',
    Label: 'QLabel',
    Entry: 'QLineEdit',
    Text: 'QTextEdit',
    Frame: 'QFrame',
    Canvas: 'QWidget',
    Listbox: 'QListWidget',
    Scale: 'QSlider',
    Checkbutton: 'QCheckBox',
    Radiobutton: 'QRadioButton',
    Combobox: 'QComboBox',
    Spinbox: 'QSpinBox',
    GridContainer: 'QWidget',
    LabelFrame: 'QGroupBox',
    Notebook: 'QTabWidget',
    PanedWindow: 'QSplitter',
    Progressbar: 'QProgressBar',
    Treeview: 'QTreeWidget',
    Separator: 'QFrame',
    Scrollbar: 'QScrollBar',
    OptionMenu: 'QComboBox',
    Custom: 'QLabel',
  };
  return map[type] || 'QWidget';
}

function emitWidget(node: IRNode, parentVar: string, level: number, isRoot: boolean = false, windowWidth?: number, windowHeight?: number): string[] {
  const varName = sanitizeName(node.name);
  const qtClass = qtWidgetClass(node.type);

  const lines: string[] = [];
  const styleSheet = styleToQtStyleSheet(node.style);

  // Constructor
  if (node.type === 'Custom') {
    lines.push(`${indent(level)}self.${varName} = QLabel("[Custom: ${node.abstract_props.label || node.name}]", ${parentVar})`);
  } else if (node.type === 'LabelFrame' && node.abstract_props.label) {
    lines.push(`${indent(level)}self.${varName} = ${qtClass}("${node.abstract_props.label}", ${parentVar})`);
  } else if (node.type === 'Notebook') {
    lines.push(`${indent(level)}self.${varName} = ${qtClass}()`);
  } else if (node.type === 'OptionMenu') {
    lines.push(`${indent(level)}self.${varName} = ${qtClass}(${parentVar})`);
  } else {
    lines.push(`${indent(level)}self.${varName} = ${qtClass}(${parentVar})`);
  }

  // Geometry
  if (isRoot) {
    lines.push(`${indent(level)}self.${varName}.setGeometry(0, 0, ${windowWidth ?? 800}, ${windowHeight ?? 600})`);
  } else {
    lines.push(
      `${indent(level)}self.${varName}.setGeometry(${Math.round(node.geometry.x)}, ${Math.round(node.geometry.y)}, ${Math.round(node.geometry.w)}, ${Math.round(node.geometry.h)})`
    );
  }

  // StyleSheet
  if (styleSheet) {
    lines.push(`${indent(level)}self.${varName}.setStyleSheet("${styleSheet}")`);
  }

  // Widget-specific config
  if (node.type === 'Button' || node.type === 'Label') {
    if (node.abstract_props.label) {
      lines.push(`${indent(level)}self.${varName}.setText("${node.abstract_props.label}")`);
    }
  }
  if (node.type === 'Entry') {
    if (node.abstract_props.label) {
      lines.push(`${indent(level)}self.${varName}.setPlaceholderText("${node.abstract_props.label}")`);
    }
  }
  if (node.type === 'Scale') {
    const min = node.widget_props?.from ?? 0;
    const max = node.widget_props?.to ?? 100;
    const orient = node.widget_props?.orient ?? 'horizontal';
    lines.push(`${indent(level)}self.${varName}.setMinimum(${min})`);
    lines.push(`${indent(level)}self.${varName}.setMaximum(${max})`);
    if (orient === 'vertical') {
      lines.push(`${indent(level)}self.${varName}.setOrientation(Qt.Vertical)`);
    } else {
      lines.push(`${indent(level)}self.${varName}.setOrientation(Qt.Horizontal)`);
    }
  }
  if (node.type === 'Combobox' || node.type === 'OptionMenu') {
    const values = node.widget_props?.values as string[] | undefined;
    if (values && values.length > 0) {
      lines.push(`${indent(level)}self.${varName}.addItems(${JSON.stringify(values)})`);
    }
  }
  if (node.type === 'Spinbox') {
    const min = node.widget_props?.from ?? 0;
    const max = node.widget_props?.to ?? 100;
    lines.push(`${indent(level)}self.${varName}.setRange(${min}, ${max})`);
  }
  if (node.type === 'Checkbutton') {
    if (node.abstract_props.label) {
      lines.push(`${indent(level)}self.${varName}.setText("${node.abstract_props.label}")`);
    }
  }
  if (node.type === 'Radiobutton') {
    if (node.abstract_props.label) {
      lines.push(`${indent(level)}self.${varName}.setText("${node.abstract_props.label}")`);
    }
  }
  if (node.type === 'Progressbar') {
    const orient = node.widget_props?.orient ?? 'horizontal';
    const max = node.widget_props?.maximum ?? 100;
    if (orient === 'vertical') {
      lines.push(`${indent(level)}self.${varName}.setOrientation(Qt.Vertical)`);
    } else {
      lines.push(`${indent(level)}self.${varName}.setOrientation(Qt.Horizontal)`);
    }
    lines.push(`${indent(level)}self.${varName}.setRange(0, ${max})`);
  }
  if (node.type === 'Treeview') {
    const columns = (node.widget_props?.columns as string[] | undefined) ?? ['Column 1', 'Column 2'];
    lines.push(`${indent(level)}self.${varName}.setHeaderLabels(${JSON.stringify(columns)})`);
  }
  if (node.type === 'Separator') {
    const orient = node.widget_props?.orient ?? 'horizontal';
    if (orient === 'vertical') {
      lines.push(`${indent(level)}self.${varName}.setFrameShape(QFrame.VLine)`);
    } else {
      lines.push(`${indent(level)}self.${varName}.setFrameShape(QFrame.HLine)`);
    }
    lines.push(`${indent(level)}self.${varName}.setFrameShadow(QFrame.Sunken)`);
  }
  if (node.type === 'Scrollbar') {
    const orient = node.widget_props?.orient ?? 'vertical';
    if (orient === 'horizontal') {
      lines.push(`${indent(level)}self.${varName}.setOrientation(Qt.Horizontal)`);
    } else {
      lines.push(`${indent(level)}self.${varName}.setOrientation(Qt.Vertical)`);
    }
  }

  // Events
  for (const ev of node.events) {
    if (ev.name === 'on_click' && ev.inline_code) {
      lines.push(`${indent(level)}self.${varName}.clicked.connect(self._on_${varName}_click)`);
    }
  }

  // Children
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
    const defaultVal =
      sv.type === 'bool' ? (sv.default_value ? 'True' : 'False') :
      typeof sv.default_value === 'string' ? `"${sv.default_value}"` : sv.default_value;
    lines.push(`        self.${sanitizeName(sv.name)} = ${defaultVal}`);
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
    const baud = (inst.config.baudrate as number) ?? 9600;
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
    '                if val is not None:',
    '                    row.append(val)',
    '                else:',
    '                    row.append(None)',
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
    '        self._state = "normal"',
    '',
    '    def _read(self):',
    '        return getattr(self.app, self.source, None)',
    '',
    '    def _check(self, value):',
    '        if self._state == "normal":',
    '            if (self.min_val is not None and value < self.min_val) or (self.max_val is not None and value > self.max_val):',
    '                return "alarm"',
    '        else:',
    '            if self.min_val is not None and value > self.min_val + self.hysteresis:',
    '                if self.max_val is None or value < self.max_val - self.hysteresis:',
    '                    return "normal"',
    '            if self.max_val is not None and value < self.max_val - self.hysteresis:',
    '                if self.min_val is None or value > self.min_val + self.hysteresis:',
    '                    return "normal"',
    '        return self._state',
    '',
    '    def _loop(self):',
    '        while self._running:',
    '            time.sleep(0.5)',
    '            if not self._running:',
    '                break',
    '            try:',
    '                value = self._read()',
    '                if value is None:',
    '                    continue',
    '                new_state = self._check(value)',
    '                if new_state != self._state:',
    '                    self._state = new_state',
    '                    # Emit signal or print',
    '                    print(f"[ALARM] {self.source} = {value}")',
    '            except Exception:',
    '                pass',
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
    lines.push('');
    lines.push('    def run(self):');
    lines.push('        self.window.show()');
    lines.push('        sys.exit(self.app.exec())');
  } else {
    lines.push('');
    lines.push('    def run(self):');
    lines.push('        self.window.show()');
    lines.push('        sys.exit(self.app.exec())');
  }
  return lines;
}

export const pyqtGenerator: CodeGenerator = {
  name: 'PyQt6',
  backend: 'pyqt6',

  generate(doc: IRDocument): string {
    const root = doc.root;
    const settings = doc.settings;

    const needsThreading = doc.data_loggers.some((d) => d.enabled) || doc.alarms.some((a) => a.enabled);
    const needsPathlib = doc.data_loggers.some((d) => d.enabled);
    const needsDatetime = doc.data_loggers.some((d) => d.enabled);
    const needsCsv = doc.data_loggers.some((d) => d.enabled);
    const needsTime = doc.data_loggers.some((d) => d.enabled) || doc.alarms.some((a) => a.enabled);

    const lines: string[] = [];
    lines.push(`"""`);
    lines.push(`Auto-generated PyQt6 GUI — ${doc.project_name}`);
    lines.push(`Generated by LabGUI Builder on ${new Date().toISOString()}`);
    lines.push(`"""`);
    lines.push('');
    lines.push('import sys');
    lines.push('from PyQt6.QtWidgets import *');
    lines.push('from PyQt6.QtCore import Qt');
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

    if (doc.data_loggers.some((d) => d.enabled)) {
      lines.push(...emitDataLoggerHelpers());
    }
    if (doc.alarms.some((a) => a.enabled)) {
      lines.push(...emitAlarmHelpers());
    }

    lines.push('');
    lines.push('');
    lines.push(`class ${sanitizeName(doc.project_name).replace(/\s+/g, '')}Window(QMainWindow):`);
    lines.push('    def __init__(self):');
    lines.push('        super().__init__()');
    lines.push(`        self.setWindowTitle("${settings.window_title}")`);
    lines.push(`        self.setGeometry(100, 100, ${settings.window_width}, ${settings.window_height})`);

    lines.push('');
    lines.push('        # Central widget');
    lines.push('        self.central = QWidget()');
    lines.push('        self.setCentralWidget(self.central)');

    lines.push(...emitStateVariables(doc.state_variables));

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

    lines.push(...emitDataLoggerInit(doc.data_loggers));
    lines.push(...emitAlarmInit(doc.alarms));

    lines.push('');
    lines.push('        # Build UI');
    lines.push(...emitWidget(root, 'self.central', 2, true, settings.window_width, settings.window_height));

    const handlers = emitEventHandlers(root);
    if (handlers.length > 0) {
      lines.push('');
      lines.push(...handlers);
    }

    lines.push(...emitCleanupMethods(doc));
    lines.push('');

    lines.push('');
    lines.push('if __name__ == "__main__":');
    lines.push('    app = QApplication(sys.argv)');
    lines.push(`    window = ${sanitizeName(doc.project_name).replace(/\s+/g, '')}Window()`);
    lines.push('    window.show()');
    lines.push('    sys.exit(app.exec())');
    lines.push('');

    return lines.join('\n');
  },
};
