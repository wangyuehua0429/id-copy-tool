import { describe, it, expect } from 'vitest';
import { sanitizeTemplate } from '../src/templateSchema.js';

const validRaw = {
  name: '我的项目',
  watermark: {
    enabled: true, text: '仅供X使用', project: 'X', color: '#dc2626',
    opacity: 0.3, fontSize: 14, angleDeg: -30, gapX: 140, gapY: 90, includeDate: true
  },
  layout: { type: 'stack', perPage: 1, margin: 18 },
  filters: { grayscale: false, brightness: 1, contrast: 1 }
};

describe('sanitizeTemplate', () => {
  it('完全合法的模板原样保留', () => {
    const out = sanitizeTemplate(validRaw);
    expect(out.name).toBe('我的项目');
    expect(out.watermark.color).toBe('#dc2626');
    expect(out.layout.type).toBe('stack');
  });

  it('丢弃未知顶层字段', () => {
    const out = sanitizeTemplate({ ...validRaw, evil: 'x', __proto__: { y: 1 } });
    expect('evil' in out).toBe(false);
  });

  it('丢弃 watermark 中未知字段', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, eval: 'bad', imageId: 'leak' }
    });
    expect('eval' in out.watermark).toBe(false);
    expect('imageId' in out.watermark).toBe(false);
  });

  it('非法颜色回退默认', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, color: 'red; <script>' }
    });
    expect(out.watermark.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('opacity 越界夹紧到 [0,1]', () => {
    const out1 = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, opacity: 5 }
    });
    expect(out1.watermark.opacity).toBeLessThanOrEqual(1);
    const out2 = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, opacity: -1 }
    });
    expect(out2.watermark.opacity).toBeGreaterThanOrEqual(0);
  });

  it('layout.type 不在白名单时回退到 stack', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      layout: { ...validRaw.layout, type: 'evil' }
    });
    expect(out.layout.type).toBe('stack');
  });

  it('文本超过 200 字截断', () => {
    const out = sanitizeTemplate({
      ...validRaw,
      watermark: { ...validRaw.watermark, text: 'A'.repeat(500) }
    });
    expect(out.watermark.text.length).toBeLessThanOrEqual(200);
  });

  it('完全空对象返回带默认值的模板', () => {
    const out = sanitizeTemplate({});
    expect(out.name).toBe('未命名');
    expect(out.watermark.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(out.layout.type).toBe('stack');
  });

  it('非对象输入返回 null', () => {
    expect(sanitizeTemplate(null)).toBeNull();
    expect(sanitizeTemplate('x')).toBeNull();
    expect(sanitizeTemplate(123)).toBeNull();
    expect(sanitizeTemplate([])).toBeNull();
  });
});
