import { DOCUMENT_KINDS } from '../constants.js';
import { bindUploadZone } from '../upload.js';

export function mountLeftPanel({ root, store, imageStore }) {
  root.classList.add('panel');
  render();
  store.subscribe(render);

  function render() {
    const s = store.getState();
    root.replaceChildren();
    root.appendChild(h('h3', {}, ['证件列表']));
    root.appendChild(addControl(store));
    const list = h('div', { class: 'doc-list' });
    for (const doc of s.documents) {
      list.appendChild(docCard(doc, s.activeDocId === doc.id, store, imageStore));
    }
    root.appendChild(list);
  }
}

function addControl(store) {
  const sel = h('select', {});
  for (const [key, meta] of Object.entries(DOCUMENT_KINDS)) {
    sel.append(h('option', { value: key }, [meta.label]));
  }
  const btn = h('button', { class: 'primary', onclick: () => {
    store.dispatch({ type: 'DOC_ADD', kind: sel.value });
  }}, ['＋ 添加']);
  return h('div', { class: 'row' }, [sel, btn]);
}

function docCard(doc, active, store, imageStore) {
  const meta = DOCUMENT_KINDS[doc.kind] || DOCUMENT_KINDS.other;
  const card = h('div', {
    class: 'doc-card' + (active ? ' active' : ''),
    onclick: () => store.dispatch({ type: 'ACTIVE_SET', docId: doc.id })
  });
  card.append(h('div', { class: 'title' }, [meta.label]));
  card.append(h('div', { class: 'meta' }, [
    `${doc.sizeMode === 'fixed' ? '1∶1' : '自适应'} · ${doc.physicalSize.wMm} × ${doc.physicalSize.hMm} mm`
  ]));

  // 物理尺寸编辑（小输入）
  const wIn = h('input', { type: 'number', min: 5, max: 420, step: 0.1 });
  const hIn = h('input', { type: 'number', min: 5, max: 420, step: 0.1 });
  wIn.value = doc.physicalSize.wMm;
  hIn.value = doc.physicalSize.hMm;
  const applySize = () => store.dispatch({
    type: 'DOC_SET_PHYSICAL_SIZE', docId: doc.id,
    wMm: Number(wIn.value), hMm: Number(hIn.value)
  });
  wIn.addEventListener('change', applySize);
  hIn.addEventListener('change', applySize);
  const sizeRow = h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [
    h('label', {}, ['宽']), wIn, h('label', {}, ['高']), hIn
  ]);
  card.append(sizeRow);

  // sizeMode 切换
  const modeBtn = h('button', { onclick: (e) => {
    e.stopPropagation();
    store.dispatch({
      type: 'DOC_SET_SIZE_MODE', docId: doc.id,
      mode: doc.sizeMode === 'fixed' ? 'fit' : 'fixed'
    });
  }}, [doc.sizeMode === 'fixed' ? '改为自适应' : '改为锁定 1∶1']);
  const delBtn = h('button', { onclick: (e) => {
    e.stopPropagation();
    if (confirm('删除该证件？')) store.dispatch({ type: 'DOC_REMOVE', docId: doc.id });
  }}, ['删除']);
  card.append(h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [modeBtn, delBtn]));

  // slot 缩略图 + 上传
  const thumbs = h('div', { class: 'slot-thumbs' });
  for (const slot of Object.keys(doc.slots)) {
    thumbs.appendChild(slotZone(doc, slot, store, imageStore));
  }
  card.append(thumbs);

  return card;
}

const SLOT_LABEL = {
  front: '正面',
  back:  '背面'
};
const slotLabel = (name) => SLOT_LABEL[name] || name;

function slotZone(doc, slot, store, imageStore) {
  const label = slotLabel(slot);
  const zone = h('div', { class: 'slot-thumb', title: label, onclick: (e) => e.stopPropagation() });
  const cur = doc.slots[slot];
  if (cur) {
    const entry = imageStore.get(cur.imageId);
    if (entry) {
      const img = h('img', {});
      img.src = entry.url;
      zone.append(img);
    } else {
      zone.append(document.createTextNode(label));
    }
  } else {
    zone.append(document.createTextNode(label));
  }
  bindUploadZone(zone, {
    onFile: async (file) => {
      try {
        const e = await imageStore.add(file);
        store.dispatch({ type: 'DOC_ADD_SLOT', docId: doc.id, slot, imageId: e.id });
      } catch (err) {
        alert(err.message);
      }
    }
  });
  return zone;
}

function h(tag, attrs = {}, children = []) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v !== undefined && v !== null) el.setAttribute(k, v);
  }
  for (const c of children) el.append(typeof c === 'string' ? document.createTextNode(c) : c);
  return el;
}
