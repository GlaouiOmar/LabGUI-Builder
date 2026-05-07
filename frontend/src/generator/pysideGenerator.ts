import type { IRDocument } from '../types/ir';
import type { CodeGenerator } from './interface';
import { pyqtGenerator } from './pyqtGenerator';

export const pysideGenerator: CodeGenerator = {
  name: 'PySide6',
  backend: 'pyside6',

  generate(doc: IRDocument): string {
    // PySide6 is API-compatible with PyQt6, just different import names
    let code = pyqtGenerator.generate(doc);
    code = code.replace(/from PyQt6\.QtWidgets import \*/g, 'from PySide6.QtWidgets import *');
    code = code.replace(/from PyQt6\.QtCore import Qt/g, 'from PySide6.QtCore import Qt');
    return code;
  },
};
