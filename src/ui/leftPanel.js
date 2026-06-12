import { DOCUMENT_KINDS } from '../constants.js';
import { bindUploadZone } from '../upload.js';

export function mountLeftPanel({ root, store, imageStore }) {
  root.classList.add('panel');
  const list = h('div', { class: 'doc-list' });
  root.append(h('h3', {}, ['证件列表 [build: per-doc-mirror]']), addControl(store), list);
  renderList();
  store.subscribe(renderList);

  function renderList() {
    const s = store.getState();
    list.replaceChildren();
    for (const doc of s.documents) {
      list.appendChild(docCard(doc, s.activeDocId === doc.id, store, imageStore));
    }
  }
}

// 模块作用域：跨 render 保留"用户最近选过的 kind"
// 顶部下拉框和每个 doc 卡片里的下拉框都通过它同步
let lastSelectedKind = 'idCard';
let topSelRef = null;  // 顶部 select 的 DOM 引用

function addControl(store) {
  const sel = h('select', {});
  for (const [key, meta] of Object.entries(DOCUMENT_KINDS)) {
    sel.append(h('option', { value: key }, [meta.label]));
  }
  sel.value = lastSelectedKind;
  topSelRef = sel;
  // 顶部下拉框改动时，同步到 lastSelectedKind
  const track = () => { lastSelectedKind = sel.value; };
  sel.addEventListener('change', track);
  sel.addEventListener('input', track);
  sel.addEventListener('click', track);
  sel.addEventListener('blur', track);
  sel.addEventListener('focus', track);

  const btn = h('button', { class: 'primary', onclick: () => {
    track();
    store.dispatch({ type: 'DOC_ADD', kind: lastSelectedKind });
  }}, ['＋ 添加']);
  return h('div', { class: 'row' }, [sel, btn]);
}

// 供 doc 卡片调用：把卡片里选的 kind 同步到顶部下拉框 + lastSelectedKind
function mirrorKindToTop(kind) {
  lastSelectedKind = kind;
  if (topSelRef && topSelRef.value !== kind) topSelRef.value = kind;
}

function docCard(doc, active, store, imageStore) {
  const meta = DOCUMENT_KINDS[doc.kind] || DOCUMENT_KINDS.other;
  const card = h('div', {
    class: 'doc-card' + (active ? ' active' : ''),
    onclick: () => store.dispatch({ type: 'ACTIVE_SET', docId: doc.id })
  });
  card.append(h('div', { class: 'title' }, [meta.label]));

  // 右上角 ×：hover 卡片时显示；点击删除整张证件（含 confirm 防误触）
  const closeBtn = h('span', {
    class: 'doc-card-close',
    title: '删除该证件',
    onclick: (e) => {
      e.stopPropagation();
      if (confirm(`删除"${meta.label}"？`)) {
        store.dispatch({ type: 'DOC_REMOVE', docId: doc.id });
      }
    }
  }, ['×']);
  card.append(closeBtn);

  // 类型选择（每个证件独立，互不影响）
  const kindSel = h('select', {});
  for (const [key, kmeta] of Object.entries(DOCUMENT_KINDS)) {
    kindSel.append(h('option', { value: key }, [kmeta.label]));
  }
  kindSel.value = doc.kind;
  kindSel.addEventListener('change', () => {
    store.dispatch({ type: 'DOC_SET_KIND', docId: doc.id, kind: kindSel.value });
    mirrorKindToTop(kindSel.value);
  });
  card.append(h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [
    h('label', {}, ['类型']), kindSel
  ]));

  card.append(h('div', { class: 'meta' }, [
    `${doc.sizeMode === 'fixed' ? '1∶1' : '自适应'} · ${doc.physicalSize.wMm} × ${doc.physicalSize.hMm} mm`
  ]));

  // 物理尺寸编辑 + 横竖切换
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
  const swapBtn = h('button', {
    title: '交换宽高（横竖切换）',
    class: 'swap-btn',
    onclick: (e) => {
      e.stopPropagation();
      store.dispatch({
        type: 'DOC_SET_PHYSICAL_SIZE', docId: doc.id,
        wMm: doc.physicalSize.hMm, hMm: doc.physicalSize.wMm
      });
    }
  }, ['⇄']);
  const sizeRow = h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [
    h('label', {}, ['宽']), wIn, swapBtn, h('label', {}, ['高']), hIn
  ]);
  card.append(sizeRow);

  // 1∶1 / 自适应 双按钮切换
  const isFixed = doc.sizeMode === 'fixed';
  const fixedBtn = h('button', {
    class: isFixed ? 'primary' : '',
    onclick: (e) => {
      e.stopPropagation();
      store.dispatch({ type: 'DOC_SET_SIZE_MODE', docId: doc.id, mode: 'fixed' });
    }
  }, ['1∶1']);
  const fitBtn = h('button', {
    class: !isFixed ? 'primary' : '',
    onclick: (e) => {
      e.stopPropagation();
      store.dispatch({ type: 'DOC_SET_SIZE_MODE', docId: doc.id, mode: 'fit' });
    }
  }, ['自适应']);
  card.append(h('div', { class: 'row', onclick: (e) => e.stopPropagation() }, [fixedBtn, fitBtn]));

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
  const hasImage = !!doc.slots[slot];
  const zone = h('div', {
    class: 'slot-thumb' + (hasImage ? ' has-image' : ''),
    title: label,
    onclick: (e) => {
      e.stopPropagation();
      if (hasImage) {
        store.dispatch({ type: 'ACTIVE_SET', docId: doc.id });
        store.dispatch({ type: 'ACTIVE_SLOT_SET', slotName: slot });
      }
    }
  });
  if (hasImage) {
    const entry = imageStore.get(doc.slots[slot].imageId);
    if (entry) {
      const img = h('img', {});
      img.src = entry.url;
      zone.append(img);
    } else {
      zone.append(document.createTextNode(label));
    }
    const closeBtn = h('span', {
      class: 'slot-close',
      onclick: (e) => {
        e.stopPropagation();
        store.dispatch({ type: 'DOC_REMOVE_SLOT', docId: doc.id, slot });
      }
    }, ['×']);
    zone.append(closeBtn);
  } else {
    zone.append(document.createTextNode(label));
  }
  bindUploadZone(zone, {
    onFile: async (file) => {
      try {
        const e = await imageStore.add(file);
        store.dispatch({ type: 'DOC_ADD_SLOT', docId: doc.id, slot, imageId: e.id });
        store.dispatch({ type: 'ACTIVE_SET', docId: doc.id });
        store.dispatch({ type: 'ACTIVE_SLOT_SET', slotName: slot });
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
