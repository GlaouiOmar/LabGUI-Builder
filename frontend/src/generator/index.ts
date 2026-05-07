import type { IRDocument } from '../types/ir';
import type { CodegenBackend, CodeGenerator } from './interface';
import { generateTkinterCode } from './tkinterGenerator';
import { pyqtGenerator } from './pyqtGenerator';
import { pysideGenerator } from './pysideGenerator';

const generators: Record<CodegenBackend, CodeGenerator> = {
  tkinter: {
    name: 'tkinter',
    backend: 'tkinter',
    generate: generateTkinterCode,
  },
  pyqt6: pyqtGenerator,
  pyside6: pysideGenerator,
};

export function generateCode(doc: IRDocument, backend: CodegenBackend = 'tkinter'): string {
  return generators[backend].generate(doc);
}

export { pyqtGenerator, pysideGenerator };
export type { CodegenBackend, CodeGenerator };
export { BACKEND_LABELS } from './interface';
