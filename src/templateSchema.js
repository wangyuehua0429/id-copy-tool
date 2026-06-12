import { DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS } from './constants.js';

const COLOR_RE = /^#[0-9a-f]{6}$/i;
const LAYOUT_TYPES = new Set(['stack', 'side', 'multi']);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number(v)));
const okStr = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');

function bool(v, def) { return typeof v === 'boolean' ? v : def; }
function num(v, def, lo, hi) {
  const n = Number(v);
  return Number.isFinite(n) ? clamp(n, lo, hi) : def;
}
function color(v) {
  return typeof v === 'string' && COLOR_RE.test(v) ? v : DEFAULT_WATERMARK.color;
}

function cleanWatermark(raw = {}) {
  return {
    enabled:     bool(raw.enabled, DEFAULT_WATERMARK.enabled),
    text:        okStr(raw.text || DEFAULT_WATERMARK.text, 200),
    project:     okStr(raw.project || DEFAULT_WATERMARK.project, 80),
    color:       color(raw.color),
    opacity:     num(raw.opacity,  DEFAULT_WATERMARK.opacity,  0,   1),
    fontSize:    num(raw.fontSize, DEFAULT_WATERMARK.fontSize, 6,   200),
    angleDeg:    num(raw.angleDeg, DEFAULT_WATERMARK.angleDeg, -90, 90),
    gapX:        num(raw.gapX,     DEFAULT_WATERMARK.gapX,     20,  800),
    gapY:        num(raw.gapY,     DEFAULT_WATERMARK.gapY,     20,  800),
    includeDate: bool(raw.includeDate, DEFAULT_WATERMARK.includeDate)
  };
}

function cleanLayout(raw = {}) {
  const type = LAYOUT_TYPES.has(raw.type) ? raw.type : DEFAULT_LAYOUT.type;
  return {
    type,
    perPage: num(raw.perPage, DEFAULT_LAYOUT.perPage, 1, 12),
    margin:  num(raw.margin,  DEFAULT_LAYOUT.margin,  0, 50),
    gap:     num(raw.gap,     DEFAULT_LAYOUT.gap,     0, 80)
  };
}

function cleanFilters(raw = {}) {
  return {
    grayscale:  bool(raw.grayscale, DEFAULT_FILTERS.grayscale),
    brightness: num(raw.brightness, DEFAULT_FILTERS.brightness, 0.5, 1.5),
    contrast:   num(raw.contrast,   DEFAULT_FILTERS.contrast,   0.5, 1.5)
  };
}

export function sanitizeTemplate(raw) {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return {
    name:      okStr(raw.name, 60) || '未命名',
    watermark: cleanWatermark(raw.watermark),
    layout:    cleanLayout(raw.layout),
    filters:   cleanFilters(raw.filters)
  };
}
