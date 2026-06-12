import { describe, it, expect, beforeEach } from 'vitest';
import { createTemplateService } from '../src/templates.js';

const validJson = JSON.stringify({
  name: 'X',
  watermark: { color: '#112233', opacity: 0.5, fontSize: 16,
               angleDeg: -20, gapX: 100, gapY: 60, includeDate: true,
               text: 'A', project: 'B', enabled: true },
  layout: { type: 'side', perPage: 1, margin: 12 },
  filters: { grayscale: true, brightness: 1, contrast: 1 }
});

beforeEach(() => {
  globalThis.localStorage.clear();
});

describe('createTemplateService', () => {
  it('list() 初始为空', () => {
    const svc = createTemplateService();
    expect(svc.list()).toEqual([]);
  });

  it('save() → list() 包含新模板，每个有 id', () => {
    const svc = createTemplateService();
    const saved = svc.save({ name: '新模板', watermark: {}, layout: {}, filters: {} });
    expect(saved.id).toMatch(/^tpl_/);
    expect(svc.list()).toHaveLength(1);
  });

  it('save(同 id) 覆盖', () => {
    const svc = createTemplateService();
    const a = svc.save({ name: 'A', watermark: {}, layout: {}, filters: {} });
    svc.save({ id: a.id, name: 'A2', watermark: {}, layout: {}, filters: {} });
    expect(svc.list()).toHaveLength(1);
    expect(svc.list()[0].name).toBe('A2');
  });

  it('remove()', () => {
    const svc = createTemplateService();
    const a = svc.save({ name: 'A', watermark: {}, layout: {}, filters: {} });
    svc.remove(a.id);
    expect(svc.list()).toEqual([]);
  });

  it('exportJson 返回包含 sanitize 后字段', () => {
    const svc = createTemplateService();
    const a = svc.save({ name: 'A', watermark: { color: 'bad' }, layout: {}, filters: {} });
    const text = svc.exportJson(a.id);
    const parsed = JSON.parse(text);
    expect(parsed.watermark.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('importJson 接收合法 JSON 并保存', () => {
    const svc = createTemplateService();
    const t = svc.importJson(validJson);
    expect(t.watermark.color).toBe('#112233');
    expect(svc.list()).toHaveLength(1);
  });

  it('importJson 非对象 / 非法 JSON 抛错', () => {
    const svc = createTemplateService();
    expect(() => svc.importJson('not json {')).toThrow();
    expect(() => svc.importJson('"hi"')).toThrow();
  });

  it('localStorage 写失败时降级（不抛错）', () => {
    const svc = createTemplateService();
    const orig = globalThis.localStorage.setItem;
    globalThis.localStorage.setItem = () => { throw new Error('quota'); };
    expect(() => svc.save({ name: 'X', watermark: {}, layout: {}, filters: {} })).not.toThrow();
    globalThis.localStorage.setItem = orig;
  });

  it('模板列表里不应出现 imageId（防泄漏）', () => {
    const svc = createTemplateService();
    svc.save({ name: 'A', watermark: { imageId: 'leak' }, layout: {}, filters: {} });
    const t = svc.list()[0];
    expect('imageId' in t.watermark).toBe(false);
  });
});
