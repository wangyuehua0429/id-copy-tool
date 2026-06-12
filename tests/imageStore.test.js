import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createImageStore } from '../src/imageStore.js';

const fakeBlob = (name = 'a.png') =>
  new File([new Uint8Array([1, 2, 3])], name, { type: 'image/png' });

beforeEach(() => {
  let n = 0;
  globalThis.URL.createObjectURL = vi.fn(() => `blob:fake-${++n}`);
  globalThis.URL.revokeObjectURL = vi.fn();
  globalThis.createImageBitmap = vi.fn(async () => ({
    width: 100, height: 60, close: vi.fn()
  }));
});

describe('createImageStore', () => {
  it('add 返回 id 和 bitmap', async () => {
    const store = createImageStore();
    const entry = await store.add(fakeBlob());
    expect(entry.id).toMatch(/^img_/);
    expect(entry.naturalWidth).toBe(100);
    expect(entry.naturalHeight).toBe(60);
    expect(globalThis.URL.createObjectURL).toHaveBeenCalled();
  });

  it('get 返回先前 add 的条目', async () => {
    const store = createImageStore();
    const { id } = await store.add(fakeBlob());
    expect(store.get(id)).not.toBeNull();
  });

  it('remove 释放 ObjectURL 并关闭 bitmap', async () => {
    const store = createImageStore();
    const { id } = await store.add(fakeBlob());
    store.remove(id);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalled();
    expect(store.get(id)).toBeNull();
  });

  it('clear 释放所有', async () => {
    const store = createImageStore();
    await store.add(fakeBlob('a'));
    await store.add(fakeBlob('b'));
    store.clear();
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it('add 非 image/* 文件抛错', async () => {
    const store = createImageStore();
    const txt = new File(['hi'], 'a.txt', { type: 'text/plain' });
    await expect(store.add(txt)).rejects.toThrow(/请选择图片文件/);
  });
});
