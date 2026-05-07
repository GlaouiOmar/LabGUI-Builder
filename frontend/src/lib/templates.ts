import { nanoid } from 'nanoid';
import type { IRDocument } from '../types/ir';
import { createNewDocument } from '../stores/projectStore';

export interface LabTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  document: IRDocument;
}

export const LAB_TEMPLATES: LabTemplate[] = [
  {
    id: 'multimeter-readout',
    name: 'Multimeter Readout',
    description: 'Basic voltage/current/resistance readout display with connect button',
    category: 'Instrument',
    document: (() => {
      const doc = createNewDocument('Multimeter Readout');
      doc.settings.window_title = 'Multimeter Readout';
      doc.settings.window_width = 400;
      doc.settings.window_height = 280;

      doc.root.children = [
        {
          id: nanoid(), type: 'Label', name: 'lbl_title',
          abstract_props: { label: 'Multimeter Readout', enabled: true, visible: true },
          geometry: { x: 20, y: 16, w: 200, h: 28 },
          style: { fg: '#cdd6f4', font_family: 'Inter', font_size: 14, font_weight: 'bold' },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Label', name: 'lbl_voltage',
          abstract_props: { label: 'Voltage (V):', enabled: true, visible: true },
          geometry: { x: 20, y: 60, w: 100, h: 24 },
          style: { fg: '#a6adc8', font_family: 'Inter', font_size: 11 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Entry', name: 'ent_voltage',
          abstract_props: { label: '', enabled: true, visible: true },
          geometry: { x: 130, y: 58, w: 120, h: 28 },
          style: { bg: '#313244', fg: '#89b4fa', font_family: 'JetBrains Mono', font_size: 11, border_width: 1, border_color: '#45475a', border_radius: 4 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Label', name: 'lbl_current',
          abstract_props: { label: 'Current (A):', enabled: true, visible: true },
          geometry: { x: 20, y: 100, w: 100, h: 24 },
          style: { fg: '#a6adc8', font_family: 'Inter', font_size: 11 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Entry', name: 'ent_current',
          abstract_props: { label: '', enabled: true, visible: true },
          geometry: { x: 130, y: 98, w: 120, h: 28 },
          style: { bg: '#313244', fg: '#89b4fa', font_family: 'JetBrains Mono', font_size: 11, border_width: 1, border_color: '#45475a', border_radius: 4 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Label', name: 'lbl_resistance',
          abstract_props: { label: 'Resistance (Ω):', enabled: true, visible: true },
          geometry: { x: 20, y: 140, w: 100, h: 24 },
          style: { fg: '#a6adc8', font_family: 'Inter', font_size: 11 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Entry', name: 'ent_resistance',
          abstract_props: { label: '', enabled: true, visible: true },
          geometry: { x: 130, y: 138, w: 120, h: 28 },
          style: { bg: '#313244', fg: '#89b4fa', font_family: 'JetBrains Mono', font_size: 11, border_width: 1, border_color: '#45475a', border_radius: 4 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Button', name: 'btn_connect',
          abstract_props: { label: 'Connect', enabled: true, visible: true },
          geometry: { x: 20, y: 190, w: 100, h: 32 },
          style: { bg: '#89b4fa', fg: '#1e1e2e', font_family: 'Inter', font_size: 11, font_weight: 'bold', border_radius: 4 },
          events: [{ name: 'on_click' }], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Button', name: 'btn_read',
          abstract_props: { label: 'Read', enabled: true, visible: true },
          geometry: { x: 140, y: 190, w: 100, h: 32 },
          style: { bg: '#45475a', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, border_radius: 4 },
          events: [{ name: 'on_click' }], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
      ];

      doc.state_variables = [
        { id: nanoid(), name: 'voltage', type: 'float', default_value: 0.0, format: '%.6f V' },
        { id: nanoid(), name: 'current', type: 'float', default_value: 0.0, format: '%.6f A' },
        { id: nanoid(), name: 'resistance', type: 'float', default_value: 0.0, format: '%.2f Ω' },
      ];

      doc.instruments = [
        {
          id: nanoid(), name: 'dmm', protocol: 'visa',
          config: { resource_string: 'GPIB0::22::INSTR', timeout_ms: 5000 },
          commands: [
            { id: nanoid(), name: 'read_voltage', send: 'MEAS:VOLT:DC?\\n', parse: 'float', timeout: 5 },
            { id: nanoid(), name: 'read_current', send: 'MEAS:CURR:DC?\\n', parse: 'float', timeout: 5 },
            { id: nanoid(), name: 'read_resistance', send: 'MEAS:RES?\\n', parse: 'float', timeout: 5 },
          ],
        },
      ];

      return doc;
    })(),
  },
  {
    id: 'serial-monitor',
    name: 'Serial Monitor',
    description: 'Simple serial port monitor with send/receive text areas',
    category: 'Serial',
    document: (() => {
      const doc = createNewDocument('Serial Monitor');
      doc.settings.window_title = 'Serial Monitor';
      doc.settings.window_width = 600;
      doc.settings.window_height = 450;

      const frmReceiveId = nanoid();
      const frmSendId = nanoid();

      doc.root.children = [
        {
          id: nanoid(), type: 'Label', name: 'lbl_port',
          abstract_props: { label: 'Port:', enabled: true, visible: true },
          geometry: { x: 20, y: 16, w: 40, h: 24 },
          style: { fg: '#a6adc8', font_family: 'Inter', font_size: 11 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Combobox', name: 'cmb_port',
          abstract_props: { label: '', enabled: true, visible: true },
          geometry: { x: 70, y: 14, w: 120, h: 28 },
          style: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, border_width: 1, border_color: '#45475a', border_radius: 4 },
          widget_props: { values: ['COM1', 'COM2', 'COM3', 'COM4'] },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Button', name: 'btn_connect',
          abstract_props: { label: 'Connect', enabled: true, visible: true },
          geometry: { x: 210, y: 14, w: 90, h: 28 },
          style: { bg: '#89b4fa', fg: '#1e1e2e', font_family: 'Inter', font_size: 11, font_weight: 'bold', border_radius: 4 },
          events: [{ name: 'on_click' }], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: frmReceiveId, type: 'LabelFrame', name: 'frm_receive',
          abstract_props: { label: 'Receive', enabled: true, visible: true },
          geometry: { x: 20, y: 60, w: 560, h: 200 },
          style: { bg: '#1e1e2e', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'bold', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'groove' },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: frmSendId, type: 'LabelFrame', name: 'frm_send',
          abstract_props: { label: 'Send', enabled: true, visible: true },
          geometry: { x: 20, y: 280, w: 560, h: 100 },
          style: { bg: '#1e1e2e', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, font_weight: 'bold', border_width: 1, border_color: '#45475a', border_radius: 4, relief: 'groove' },
          events: [], children: [
            {
              id: nanoid(), type: 'Entry', name: 'ent_send',
              abstract_props: { label: '', enabled: true, visible: true },
              geometry: { x: 20, y: 30, w: 440, h: 28 },
              style: { bg: '#313244', fg: '#cdd6f4', font_family: 'JetBrains Mono', font_size: 11, border_width: 1, border_color: '#45475a', border_radius: 4 },
              events: [], children: [], parent: frmSendId, locked: false, hidden: false,
            },
            {
              id: nanoid(), type: 'Button', name: 'btn_send',
              abstract_props: { label: 'Send', enabled: true, visible: true },
              geometry: { x: 470, y: 30, w: 70, h: 28 },
              style: { bg: '#45475a', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, border_radius: 4 },
              events: [{ name: 'on_click' }], children: [], parent: frmSendId, locked: false, hidden: false,
            },
          ], parent: doc.root.id, locked: false, hidden: false,
        },
      ];

      doc.instruments = [
        {
          id: nanoid(), name: 'serial_port', protocol: 'serial',
          config: { port: 'COM1', baudrate: 9600 },
          commands: [],
        },
      ];

      return doc;
    })(),
  },
  {
    id: 'basic-form',
    name: 'Basic Form',
    description: 'Simple data entry form with labels and entries',
    category: 'General',
    document: (() => {
      const doc = createNewDocument('Basic Form');
      doc.settings.window_title = 'Basic Form';
      doc.settings.window_width = 360;
      doc.settings.window_height = 280;

      const fields = [
        { label: 'Sample Name:', y: 20 },
        { label: 'Operator:', y: 60 },
        { label: 'Temperature:', y: 100 },
        { label: 'Pressure:', y: 140 },
      ];

      doc.root.children = fields.map((f, i) => [
        {
          id: nanoid(), type: 'Label' as const, name: `lbl_${i}`,
          abstract_props: { label: f.label, enabled: true, visible: true },
          geometry: { x: 20, y: f.y, w: 110, h: 24 },
          style: { fg: '#a6adc8', font_family: 'Inter', font_size: 11 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
        {
          id: nanoid(), type: 'Entry' as const, name: `ent_${i}`,
          abstract_props: { label: '', enabled: true, visible: true },
          geometry: { x: 140, y: f.y - 2, w: 180, h: 28 },
          style: { bg: '#313244', fg: '#cdd6f4', font_family: 'Inter', font_size: 11, border_width: 1, border_color: '#45475a', border_radius: 4 },
          events: [], children: [], parent: doc.root.id, locked: false, hidden: false,
        },
      ]).flat();

      doc.root.children.push({
        id: nanoid(), type: 'Button', name: 'btn_save',
        abstract_props: { label: 'Save', enabled: true, visible: true },
        geometry: { x: 140, y: 200, w: 80, h: 32 },
        style: { bg: '#89b4fa', fg: '#1e1e2e', font_family: 'Inter', font_size: 11, font_weight: 'bold', border_radius: 4 },
        events: [{ name: 'on_click' }], children: [], parent: doc.root.id, locked: false, hidden: false,
      });

      return doc;
    })(),
  },
];
