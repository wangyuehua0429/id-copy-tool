import {
  DOCUMENT_KINDS, DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS, DEFAULT_TRANSFORM
} from './constants.js';

let _seq = 0;
const nextId = (p) => `${p}_${++_seq}`;

const clampSize = (v) => Math.max(5, Math.min(420, Number(v) || 5));

function blankSlots(kind) {
  const slots = {};
  for (const name of DOCUMENT_KINDS[kind].slots) slots[name] = null;
  return slots;
}

function newDocument(kind) {
  const meta = DOCUMENT_KINDS[kind] || DOCUMENT_KINDS.other;
  return {
    id: nextId('doc'),
    kind,
    sizeMode: meta.sizeMode,
    physicalSize: { ...meta.physicalSize },
    slots: blankSlots(kind)
  };
}

function newSlot(imageId) {
  return {
    imageId,
    transform: { ...DEFAULT_TRANSFORM, cropRect: null },
    filters: { brightness: 1, contrast: 1, grayscale: false }
  };
}

function loadPersisted(key, defaults) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch (_) {}
  return { ...defaults };
}

function initialState() {
  return {
    documents: [],
    layout: loadPersisted('idcopy_layout', DEFAULT_LAYOUT),
    watermark: loadPersisted('idcopy_watermark', DEFAULT_WATERMARK),
    filters: loadPersisted('idcopy_filters', DEFAULT_FILTERS),
    templates: [],
    activeDocId: null,
    activeSlotName: null
  };
}

function reducer(state, action) {
  switch (action.type) {
    case 'DOC_ADD': {
      const doc = newDocument(action.kind);
      return { ...state, documents: [...state.documents, doc], activeDocId: doc.id };
    }
    case 'DOC_REMOVE': {
      const documents = state.documents.filter(d => d.id !== action.docId);
      const activeDocId = state.activeDocId === action.docId ? null : state.activeDocId;
      return { ...state, documents, activeDocId };
    }
    case 'DOC_SET_KIND': {
      const meta = DOCUMENT_KINDS[action.kind] || DOCUMENT_KINDS.other;
      return mapDoc(state, action.docId, (d) => ({
        ...d,
        kind: action.kind,
        sizeMode: meta.sizeMode,
        physicalSize: { ...meta.physicalSize },
        slots: { ...blankSlots(action.kind), ...keepCommonSlots(d.slots, action.kind) }
      }));
    }
    case 'DOC_SET_SIZE_MODE':
      return mapDoc(state, action.docId, (d) => ({ ...d, sizeMode: action.mode }));
    case 'DOC_SET_PHYSICAL_SIZE':
      return mapDoc(state, action.docId, (d) => ({
        ...d,
        physicalSize: { wMm: clampSize(action.wMm), hMm: clampSize(action.hMm) }
      }));
    case 'DOC_ADD_SLOT':
      return {
        ...mapDoc(state, action.docId, (d) => ({
          ...d,
          slots: { ...d.slots, [action.slot]: newSlot(action.imageId) }
        })),
        activeSlotName: action.slot
      };
    case 'DOC_REMOVE_SLOT':
      return {
        ...mapDoc(state, action.docId, (d) => ({
          ...d,
          slots: { ...d.slots, [action.slot]: null }
        })),
        activeSlotName: state.activeSlotName === action.slot ? null : state.activeSlotName
      };
    case 'DOC_SET_SLOT_TRANSFORM':
      return mapSlot(state, action.docId, action.slot, (s) => ({
        ...s, transform: { ...s.transform, ...action.patch }
      }));
    case 'DOC_SET_SLOT_FILTERS':
      return mapSlot(state, action.docId, action.slot, (s) => ({
        ...s, filters: { ...s.filters, ...action.patch }
      }));
    case 'LAYOUT_SET':
      return { ...state, layout: { ...state.layout, ...action.patch } };
    case 'WATERMARK_SET':
      return { ...state, watermark: { ...state.watermark, ...action.patch } };
    case 'WATERMARK_TOGGLE':
      return { ...state, watermark: { ...state.watermark, enabled: !state.watermark.enabled } };
    case 'FILTERS_SET':
      return { ...state, filters: { ...state.filters, ...action.patch } };
    case 'TEMPLATE_LOAD': {
      const t = action.template;
      const keepEnabled = state.watermark.enabled;
      return {
        ...state,
        watermark: { ...t.watermark, enabled: keepEnabled },
        layout: { ...state.layout, ...t.layout },
        filters: { ...state.filters, ...t.filters }
      };
    }
    case 'TEMPLATE_SAVE': {
      const list = state.templates.filter(x => x.id !== action.template.id);
      return { ...state, templates: [...list, action.template] };
    }
    case 'TEMPLATE_REMOVE':
      return { ...state, templates: state.templates.filter(x => x.id !== action.id) };
    case 'TEMPLATES_SET':
      return { ...state, templates: action.templates };
    case 'ACTIVE_SET':
      return { ...state, activeDocId: action.docId, activeSlotName: null };
    case 'ACTIVE_SLOT_SET':
      return { ...state, activeSlotName: action.slotName };
    default:
      return state;
  }
}

function mapDoc(state, id, fn) {
  return { ...state, documents: state.documents.map(d => d.id === id ? fn(d) : d) };
}

function mapSlot(state, docId, slotName, fn) {
  return mapDoc(state, docId, (d) => {
    const cur = d.slots[slotName];
    if (!cur) return d;
    return { ...d, slots: { ...d.slots, [slotName]: fn(cur) } };
  });
}

function keepCommonSlots(oldSlots, newKind) {
  const result = {};
  for (const name of DOCUMENT_KINDS[newKind].slots) {
    if (oldSlots[name]) result[name] = oldSlots[name];
  }
  return result;
}

export function createStore(seed = initialState()) {
  let state = seed;
  const listeners = new Set();
  return {
    getState() { return state; },
    dispatch(action) {
      state = reducer(state, action);
      for (const l of listeners) l(state, action);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    }
  };
}
