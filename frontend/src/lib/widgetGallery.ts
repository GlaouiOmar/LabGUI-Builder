/**
 * LabGUI Widget Gallery — ThingsBoard-style rich HTML/CSS/JS widgets.
 * Each gallery entry produces a Custom widget with pre-filled content.
 */

export interface GalleryWidget {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  category: 'Gauge' | 'Chart' | 'Control' | 'Display';
  defaultGeometry: { w: number; h: number };
  html: string;
  css: string;
  js: string;
  defaultProps?: Record<string, unknown>;
}

export const GALLERY_WIDGETS: GalleryWidget[] = [
  {
    id: 'analog-gauge',
    name: 'Analog Gauge',
    description: 'Circular gauge with animated needle',
    icon: 'Gauge',
    category: 'Gauge',
    defaultGeometry: { w: 200, h: 200 },
    html: `<div class="gauge-container">
  <svg viewBox="0 0 200 200" class="gauge-svg">
    <circle cx="100" cy="100" r="90" fill="none" stroke="#313244" stroke-width="12" />
    <path id="gauge-arc" d="" fill="none" stroke="#89b4fa" stroke-width="12" stroke-linecap="round" />
    <circle cx="100" cy="100" r="6" fill="#cdd6f4" />
    <line id="gauge-needle" x1="100" y1="100" x2="100" y2="30" stroke="#f38ba8" stroke-width="3" stroke-linecap="round" />
  </svg>
  <div class="gauge-value" id="gauge-value">0</div>
  <div class="gauge-label">Units</div>
</div>`,
    css: `.gauge-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #1e1e2e;
  border-radius: 8px;
  font-family: 'Inter', sans-serif;
}
.gauge-svg {
  width: 80%;
  height: auto;
}
.gauge-value {
  font-size: 28px;
  font-weight: bold;
  color: #cdd6f4;
  margin-top: -10px;
}
.gauge-label {
  font-size: 12px;
  color: #6c7086;
  text-transform: uppercase;
  letter-spacing: 1px;
}`,
    js: `function updateGauge(value, min, max) {
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const angle = -135 + (pct * 270);
  const rad = (angle - 90) * Math.PI / 180;
  const x2 = 100 + 70 * Math.cos(rad);
  const y2 = 100 + 70 * Math.sin(rad);
  document.getElementById('gauge-needle').setAttribute('x2', x2);
  document.getElementById('gauge-needle').setAttribute('y2', y2);
  document.getElementById('gauge-value').textContent = value;
}
function describeArc(x, y, r, startAngle, endAngle) {
  const start = (startAngle - 90) * Math.PI / 180;
  const end = (endAngle - 90) * Math.PI / 180;
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return [
    'M', x + r * Math.cos(start), y + r * Math.sin(start),
    'A', r, r, 0, largeArc, 1, x + r * Math.cos(end), y + r * Math.sin(end)
  ].join(' ');
}
document.getElementById('gauge-arc').setAttribute('d', describeArc(100, 100, 90, -135, 135));
updateGauge(42, 0, 100);
`,
    defaultProps: { min: 0, max: 100, value: 42, unit: 'V' },
  },

  {
    id: 'digital-display',
    name: 'Digital Display',
    description: '7-segment style digital readout',
    icon: 'Binary',
    category: 'Display',
    defaultGeometry: { w: 180, h: 80 },
    html: `<div class="dig-container">
  <div class="dig-value" id="dig-value">0.00</div>
  <div class="dig-unit" id="dig-unit">VDC</div>
</div>`,
    css: `.dig-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #11111b;
  border-radius: 8px;
  border: 2px solid #313244;
  font-family: 'JetBrains Mono', monospace;
}
.dig-value {
  font-size: 36px;
  font-weight: bold;
  color: #a6e3a1;
  text-shadow: 0 0 10px #a6e3a140;
}
.dig-unit {
  font-size: 12px;
  color: #6c7086;
  margin-top: 4px;
  letter-spacing: 2px;
}`,
    js: `function setValue(v, unit) {
  document.getElementById('dig-value').textContent = parseFloat(v).toFixed(2);
  if (unit) document.getElementById('dig-unit').textContent = unit;
}
setValue(12.45, 'VDC');
`,
    defaultProps: { value: 12.45, unit: 'VDC' },
  },

  {
    id: 'line-chart',
    name: 'Line Chart',
    description: 'Time-series line chart with canvas',
    icon: 'TrendingUp',
    category: 'Chart',
    defaultGeometry: { w: 320, h: 200 },
    html: `<canvas id="chart-canvas" class="chart-canvas"></canvas>`,
    css: `.chart-canvas {
  width: 100%;
  height: 100%;
  background: #1e1e2e;
  border-radius: 8px;
}`,
    js: `const canvas = document.getElementById('chart-canvas');
const ctx = canvas.getContext('2d');
function resize() {
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
}
resize();
window.addEventListener('resize', resize);

const data = [20, 35, 40, 30, 55, 65, 50, 70, 60, 80];
function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#313244';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = (h / 4) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  ctx.strokeStyle = '#89b4fa';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const step = w / (data.length - 1);
  data.forEach((v, i) => {
    const x = i * step;
    const y = h - (v / 100) * h;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.fillStyle = '#89b4fa40';
  ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.closePath(); ctx.fill();
}
draw();
`,
    defaultProps: { title: 'Voltage' },
  },

  {
    id: 'bar-chart',
    name: 'Bar Chart',
    description: 'Vertical bar chart',
    icon: 'BarChart3',
    category: 'Chart',
    defaultGeometry: { w: 300, h: 200 },
    html: `<canvas id="bar-canvas" class="bar-canvas"></canvas>`,
    css: `.bar-canvas {
  width: 100%;
  height: 100%;
  background: #1e1e2e;
  border-radius: 8px;
}`,
    js: `const canvas = document.getElementById('bar-canvas');
const ctx = canvas.getContext('2d');
function resize() {
  canvas.width = canvas.offsetWidth * 2;
  canvas.height = canvas.offsetHeight * 2;
}
resize();
const data = [65, 40, 85, 55, 30, 70];
const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const colors = ['#89b4fa', '#a6e3a1', '#f38ba8', '#fab387', '#cba6f7', '#74c7ec'];
function draw() {
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  const barW = (w / data.length) * 0.6;
  const gap = (w / data.length) * 0.4;
  data.forEach((v, i) => {
    const x = i * (barW + gap) + gap / 2;
    const barH = (v / 100) * (h - 40);
    const y = h - barH - 20;
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(x, y, barW, barH);
    ctx.fillStyle = '#6c7086';
    ctx.font = 'bold 20px Inter';
    ctx.fillText(labels[i], x + barW / 2 - 20, h - 2);
  });
}
draw();
`,
    defaultProps: { title: 'Readings' },
  },

  {
    id: 'toggle-switch',
    name: 'Toggle Switch',
    description: 'Animated on/off toggle',
    icon: 'ToggleLeft',
    category: 'Control',
    defaultGeometry: { w: 80, h: 40 },
    html: `<label class="switch">
  <input type="checkbox" id="toggle-input">
  <span class="slider"></span>
</label>
<div class="switch-label" id="switch-label">OFF</div>`,
    css: `.switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 32px;
}
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute;
  cursor: pointer;
  top: 0; left: 0; right: 0; bottom: 0;
  background-color: #313244;
  transition: .3s;
  border-radius: 32px;
}
.slider:before {
  position: absolute;
  content: "";
  height: 24px;
  width: 24px;
  left: 4px;
  bottom: 4px;
  background-color: #cdd6f4;
  transition: .3s;
  border-radius: 50%;
}
input:checked + .slider { background-color: #a6e3a1; }
input:checked + .slider:before { transform: translateX(28px); background-color: #1e1e2e; }
.switch-label {
  margin-top: 6px;
  font-size: 10px;
  color: #6c7086;
  text-align: center;
  font-family: Inter;
  letter-spacing: 1px;
}`,
    js: `document.getElementById('toggle-input').addEventListener('change', function(e) {
  document.getElementById('switch-label').textContent = e.target.checked ? 'ON' : 'OFF';
});
`,
    defaultProps: { checked: false, label: 'Power' },
  },

  {
    id: 'metric-card',
    name: 'Metric Card',
    description: 'Big number card with icon and trend',
    icon: 'LayoutDashboard',
    category: 'Display',
    defaultGeometry: { w: 200, h: 100 },
    html: `<div class="metric-card">
  <div class="metric-header">
    <div class="metric-title" id="metric-title">Voltage</div>
    <div class="metric-trend" id="metric-trend">▲ 2.4%</div>
  </div>
  <div class="metric-value" id="metric-value">12.45</div>
  <div class="metric-unit" id="metric-unit">VDC</div>
</div>`,
    css: `.metric-card {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #313244 0%, #1e1e2e 100%);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: 'Inter', sans-serif;
  box-sizing: border-box;
  border: 1px solid #45475a;
}
.metric-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.metric-title {
  font-size: 12px;
  color: #6c7086;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.metric-trend {
  font-size: 11px;
  color: #a6e3a1;
  font-weight: 600;
}
.metric-value {
  font-size: 32px;
  font-weight: bold;
  color: #cdd6f4;
  margin-top: 4px;
}
.metric-unit {
  font-size: 11px;
  color: #6c7086;
}`,
    js: `function setMetric(title, value, unit, trend) {
  if (title) document.getElementById('metric-title').textContent = title;
  if (value !== undefined) document.getElementById('metric-value').textContent = value;
  if (unit) document.getElementById('metric-unit').textContent = unit;
  if (trend) document.getElementById('metric-trend').textContent = trend;
}
setMetric('Voltage', '12.45', 'VDC', '▲ 2.4%');
`,
    defaultProps: { title: 'Voltage', value: 12.45, unit: 'VDC', trend: '▲ 2.4%' },
  },
];

export const GALLERY_CATEGORIES = [
  { key: 'Gauge', label: 'Gauges' },
  { key: 'Chart', label: 'Charts' },
  { key: 'Control', label: 'Controls' },
  { key: 'Display', label: 'Displays' },
];
