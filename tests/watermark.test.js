import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveText, drawTo } from '../src/watermark.js';
import { DEFAULT_WATERMARK } from '../src/constants.js';

describe('resolveText — 占位符替换', () => {
  it('替换 {project} 与 {date}', () => {
    const text = resolveText(
      { ...DEFAULT_WATERMARK, project: 'XYZ', includeDate: true },
      new Date('2026-06-12T00:00:00')
    );
    expect(text).toBe('仅供XYZ投标使用 2026-06-12');
  });

  it('includeDate=false 时不出现日期', () => {
    const text = resolveText(
      { ...DEFAULT_WATERMARK, text: '仅供{project}使用 {date}', project: 'X', includeDate: false },
      new Date('2026-06-12')
    );
    expect(text).toBe('仅供X使用 ');
  });

  it('文本截断到 200 字', () => {
    const text = resolveText(
      { ...DEFAULT_WATERMARK, text: 'A'.repeat(500), project: '', includeDate: false },
      new Date('2026-06-12')
    );
    expect(text.length).toBeLessThanOrEqual(200);
  });
});

describe('drawTo — Canvas 调用', () => {
  let ctx;
  beforeEach(() => {
    ctx = {
      save: vi.fn(), restore: vi.fn(),
      translate: vi.fn(), rotate: vi.fn(),
      fillText: vi.fn(),
      measureText: vi.fn(() => ({ width: 100 })),
      set globalAlpha(v) { this._alpha = v; }, get globalAlpha() { return this._alpha; },
      set fillStyle(v) { this._fill = v; }, get fillStyle() { return this._fill; },
      set font(v) { this._font = v; }, get font() { return this._font; },
      set textBaseline(v) { this._tb = v; }, get textBaseline() { return this._tb; }
    };
  });

  it('绘制时设置颜色、透明度、字号', () => {
    drawTo(ctx, DEFAULT_WATERMARK, { wMm: 210, hMm: 297 }, 3.78, new Date('2026-06-12'));
    expect(ctx._fill).toBe(DEFAULT_WATERMARK.color);
    expect(ctx._alpha).toBeCloseTo(DEFAULT_WATERMARK.opacity);
    expect(ctx._font).toMatch(/14/);
    expect(ctx.fillText).toHaveBeenCalled();
  });

  it('对角平铺至少绘制 5 次以上文字', () => {
    drawTo(ctx, DEFAULT_WATERMARK, { wMm: 210, hMm: 297 }, 3.78, new Date('2026-06-12'));
    expect(ctx.fillText.mock.calls.length).toBeGreaterThan(5);
  });

  it('opacity / fontSize 越界自动夹紧', () => {
    const cfg = { ...DEFAULT_WATERMARK, opacity: 5, fontSize: 999 };
    drawTo(ctx, cfg, { wMm: 210, hMm: 297 }, 3.78, new Date('2026-06-12'));
    expect(ctx._alpha).toBeLessThanOrEqual(1);
    expect(parseInt(ctx._font, 10)).toBeLessThanOrEqual(200);
  });
});
