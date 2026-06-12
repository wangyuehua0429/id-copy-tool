import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/state.js';
import {
  DOCUMENT_KINDS, DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS, DEFAULT_TRANSFORM
} from '../src/constants.js';

const init = () => createStore();

describe('createStore — 初始状态', () => {
  it('documents 为空、layout/watermark/filters 取默认值', () => {
    const s = init().getState();
    expect(s.documents).toEqual([]);
    expect(s.layout).toEqual(DEFAULT_LAYOUT);
    expect(s.watermark).toEqual(DEFAULT_WATERMARK);
    expect(s.filters).toEqual(DEFAULT_FILTERS);
    expect(s.templates).toEqual([]);
    expect(s.activeDocId).toBeNull();
  });
});

describe('createStore — DOC actions', () => {
  it('DOC_ADD 按 kind 预设 sizeMode 与 physicalSize', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const [doc] = store.getState().documents;
    expect(doc.kind).toBe('idCard');
    expect(doc.sizeMode).toBe('fixed');
    expect(doc.physicalSize).toEqual({ wMm: 85.6, hMm: 54 });
    expect(doc.slots).toEqual({ front: null, back: null });
  });

  it('DOC_SET_KIND 切换类型后重置物理尺寸与 sizeMode', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_SET_KIND', docId: id, kind: 'diploma' });
    const doc = store.getState().documents[0];
    expect(doc.kind).toBe('diploma');
    expect(doc.sizeMode).toBe('fit');
    expect(doc.physicalSize).toEqual({ wMm: 285, hMm: 210 });
  });

  it('DOC_SET_SIZE_MODE 允许用户强制切换 fixed/fit', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'diploma' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_SET_SIZE_MODE', docId: id, mode: 'fixed' });
    expect(store.getState().documents[0].sizeMode).toBe('fixed');
  });

  it('DOC_SET_PHYSICAL_SIZE 限定为正数且不超过 A4 二倍', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'other' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_SET_PHYSICAL_SIZE', docId: id, wMm: 0, hMm: -5 });
    expect(store.getState().documents[0].physicalSize.wMm).toBeGreaterThan(0);
    store.dispatch({ type: 'DOC_SET_PHYSICAL_SIZE', docId: id, wMm: 9999, hMm: 9999 });
    expect(store.getState().documents[0].physicalSize.wMm).toBeLessThanOrEqual(420);
  });

  it('DOC_ADD_SLOT 将图片绑定到指定 slot，并附默认 transform/filters', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'DOC_ADD_SLOT', docId: id, slot: 'front', imageId: 'img_1' });
    const slot = store.getState().documents[0].slots.front;
    expect(slot.imageId).toBe('img_1');
    expect(slot.transform).toEqual(DEFAULT_TRANSFORM);
    expect(slot.filters).toEqual({ brightness: 1, contrast: 1, grayscale: false });
  });

  it('DOC_REMOVE 删除文档；activeDocId 指向被删则置为 null', () => {
    const store = init();
    store.dispatch({ type: 'DOC_ADD', kind: 'idCard' });
    const id = store.getState().documents[0].id;
    store.dispatch({ type: 'ACTIVE_SET', docId: id });
    store.dispatch({ type: 'DOC_REMOVE', docId: id });
    expect(store.getState().documents).toEqual([]);
    expect(store.getState().activeDocId).toBeNull();
  });
});

describe('createStore — WATERMARK & LAYOUT', () => {
  it('WATERMARK_TOGGLE 切换 enabled', () => {
    const store = init();
    expect(store.getState().watermark.enabled).toBe(true);
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    expect(store.getState().watermark.enabled).toBe(false);
  });

  it('WATERMARK_SET 合并 patch 但保留 enabled', () => {
    const store = init();
    store.dispatch({ type: 'WATERMARK_TOGGLE' });   // 关到 false
    store.dispatch({ type: 'WATERMARK_SET', patch: { color: '#000000' } });
    expect(store.getState().watermark.color).toBe('#000000');
    expect(store.getState().watermark.enabled).toBe(false);
  });

  it('LAYOUT_SET 合并 patch', () => {
    const store = init();
    store.dispatch({ type: 'LAYOUT_SET', patch: { type: 'multi', perPage: 3 } });
    expect(store.getState().layout.type).toBe('multi');
    expect(store.getState().layout.perPage).toBe(3);
    expect(store.getState().layout.margin).toBe(18);
  });

  it('TEMPLATE_LOAD 应用模板但尊重当前 watermark.enabled', () => {
    const store = init();
    store.dispatch({ type: 'WATERMARK_TOGGLE' });   // 关闭
    store.dispatch({
      type: 'TEMPLATE_LOAD',
      template: {
        name: 't',
        watermark: { ...DEFAULT_WATERMARK, enabled: true, color: '#123456' },
        layout: { type: 'side', perPage: 1, margin: 10 },
        filters: { grayscale: true, brightness: 1, contrast: 1 }
      }
    });
    const s = store.getState();
    expect(s.watermark.enabled).toBe(false);          // 不被模板覆盖
    expect(s.watermark.color).toBe('#123456');        // 其它字段被覆盖
    expect(s.layout.type).toBe('side');
    expect(s.filters.grayscale).toBe(true);
  });
});

describe('createStore — subscribe', () => {
  it('每次 dispatch 都通知订阅者', () => {
    const store = init();
    const spy = vi.fn();
    const unsub = store.subscribe(spy);
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    expect(spy).toHaveBeenCalledTimes(2);
    unsub();
    store.dispatch({ type: 'WATERMARK_TOGGLE' });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('未知 action 不抛错，状态不变', () => {
    const store = init();
    const before = store.getState();
    expect(() => store.dispatch({ type: 'NOPE' })).not.toThrow();
    expect(store.getState()).toBe(before);
  });
});
