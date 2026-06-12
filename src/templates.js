import { sanitizeTemplate } from './templateSchema.js';

const KEY = 'id-copy-tool.templates.v1';
let _seq = 0;
const nextId = () => `tpl_${Date.now().toString(36)}_${++_seq}`;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map(x => {
        const clean = sanitizeTemplate(x);
        if (!clean) return null;
        return { id: typeof x?.id === 'string' ? x.id : nextId(), ...clean };
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch (_) {
    return false;
  }
}

export function createTemplateService() {
  let cache = readAll();

  function list() { return cache.slice(); }

  function save(t) {
    const clean = sanitizeTemplate(t);
    if (!clean) throw new Error('模板格式不合法');
    const id = (t && typeof t.id === 'string') ? t.id : nextId();
    const entry = { id, ...clean };
    cache = cache.filter(x => x.id !== id).concat(entry);
    writeAll(cache);
    return entry;
  }

  function remove(id) {
    const before = cache.length;
    cache = cache.filter(x => x.id !== id);
    if (cache.length !== before) writeAll(cache);
    return cache.length !== before;
  }

  function exportJson(id) {
    const t = cache.find(x => x.id === id);
    if (!t) throw new Error('未找到模板');
    const { id: _ignore, ...payload } = t;
    return JSON.stringify(payload, null, 2);
  }

  function importJson(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { throw new Error('JSON 解析失败'); }
    const clean = sanitizeTemplate(parsed);
    if (!clean) throw new Error('模板内容不合法');
    return save(clean);
  }

  function refresh() { cache = readAll(); return cache.slice(); }

  return { list, save, remove, exportJson, importJson, refresh };
}
