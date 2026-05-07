import type { IRDocument } from '../types/ir';

export type CodegenBackend = 'tkinter' | 'pyqt6' | 'pyside6';

export interface CodeGenerator {
  readonly name: string;
  readonly backend: CodegenBackend;
  generate(doc: IRDocument): string;
}

export const BACKEND_LABELS: Record<CodegenBackend, string> = {
  tkinter: 'tkinter',
  pyqt6: 'PyQt6',
  pyside6: 'PySide6',
};
