import { describe, it, expect } from 'vitest';
import { compose } from '../src/layout.js';
import { A4, DEFAULT_WATERMARK } from '../src/constants.js';

const idCardDoc = (id = 'd1', front = 'img_a', back = 'img_b') => ({
  id, kind: 'idCard', sizeMode: 'fixed',
  physicalSize: { wMm: 85.6, hMm: 54 },
  slots: {
    front: front ? { imageId: front, transform: {}, filters: {} } : null,
    back:  back  ? { imageId: back,  transform: {}, filters: {} } : null
  }
});

const businessDoc = (id = 'b1') => ({
  id, kind: 'businessLicense', sizeMode: 'fit',
  physicalSize: { wMm: 297, hMm: 210 },
  slots: { front: { imageId: 'img_biz', transform: {}, filters: {} } }
});

const layoutCfg = (overrides = {}) => ({
  type: 'stack', perPage: 1, margin: 18, ...overrides
});

const wmCfg = (enabled = true) => ({ ...DEFAULT_WATERMARK, enabled });

describe('compose — 空输入', () => {
  it('无文档返回空数组', () => {
    expect(compose({ documents: [], layout: layoutCfg(), watermark: wmCfg() })).toEqual([]);
  });
});

describe('compose — stack 版式（fixed 类）', () => {
  it('单个身份证（front+back）放在 A4 上半部，水印随同', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg(),
      watermark: wmCfg(true)
    });
    expect(plans).toHaveLength(1);
    const [p] = plans;
    expect(p.pageSize).toEqual(A4);
    expect(p.items).toHaveLength(2);
    expect(p.items[0].wMm).toBeCloseTo(85.6, 3);
    expect(p.items[0].hMm).toBeCloseTo(54, 3);
    expect(p.items[1].wMm).toBeCloseTo(85.6, 3);
    // front 在 back 之上
    expect(p.items[0].yMm).toBeLessThan(p.items[1].yMm);
    // 水平居中
    expect(p.items[0].xMm).toBeCloseTo((A4.wMm - 85.6) / 2, 1);
    expect(p.watermark).not.toBeNull();
  });

  it('水印关闭时 PagePlan.watermark 为 null', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg(),
      watermark: wmCfg(false)
    });
    expect(plans[0].watermark).toBeNull();
  });
});

describe('compose — side 版式（fixed 类）', () => {
  it('身份证正反并排在 A4 顶部', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg({ type: 'side' }),
      watermark: wmCfg()
    });
    const [p] = plans;
    expect(p.items[0].yMm).toBeCloseTo(p.items[1].yMm, 1);  // 同高
    expect(p.items[0].xMm).toBeLessThan(p.items[1].xMm);
  });
});

describe('compose — multi 版式（fixed 类）', () => {
  it('身份证一页 3 份，PagePlan 含 6 项（3 正 + 3 反）', () => {
    const plans = compose({
      documents: [idCardDoc()],
      layout: layoutCfg({ type: 'multi', perPage: 3 }),
      watermark: wmCfg()
    });
    expect(plans).toHaveLength(1);
    expect(plans[0].items).toHaveLength(6);
    for (const it of plans[0].items) {
      expect(it.wMm).toBeCloseTo(85.6, 3);
      expect(it.hMm).toBeCloseTo(54, 3);
    }
  });

  it('5 个身份证 perPage=3，应产出 2 页', () => {
    const docs = Array.from({ length: 5 }, (_, i) => idCardDoc('d' + i, 'f' + i, 'b' + i));
    const plans = compose({
      documents: docs,
      layout: layoutCfg({ type: 'multi', perPage: 3 }),
      watermark: wmCfg()
    });
    expect(plans).toHaveLength(2);
  });
});

describe('compose — fit 类自适应缩放', () => {
  it('营业执照(297×210) 单独放 stack，按 A4 可用宽度缩放但不超过原尺寸', () => {
    const plans = compose({
      documents: [businessDoc()],
      layout: layoutCfg(),
      watermark: wmCfg()
    });
    const it = plans[0].items[0];
    // 可用宽度 = 210 - 2*18 = 174
    expect(it.wMm).toBeCloseTo(174, 1);
    // 等比缩放：高度 = 174 * 210/297
    expect(it.hMm).toBeCloseTo(174 * 210 / 297, 1);
  });

  it('fit 类自然尺寸 < 槽位时不放大', () => {
    const tinyFit = {
      id: 't1', kind: 'other', sizeMode: 'fit',
      physicalSize: { wMm: 50, hMm: 30 },
      slots: { front: { imageId: 'i', transform: {}, filters: {} } }
    };
    const plans = compose({
      documents: [tinyFit],
      layout: layoutCfg(),
      watermark: wmCfg()
    });
    expect(plans[0].items[0].wMm).toBe(50);
    expect(plans[0].items[0].hMm).toBe(30);
  });
});

describe('compose — fixed 类放不下自动续页', () => {
  it('一张 fixed 与一张 fit 混排 stack，fit 不挤占 fixed 的物理尺寸', () => {
    const docs = [idCardDoc(), businessDoc()];
    const plans = compose({
      documents: docs,
      layout: layoutCfg(),
      watermark: wmCfg()
    });
    // 找到身份证的两个 item
    const idItems = plans.flatMap(p => p.items).filter(i => i.docId === 'd1');
    for (const it of idItems) {
      expect(it.wMm).toBeCloseTo(85.6, 3);
      expect(it.hMm).toBeCloseTo(54, 3);
    }
  });

  it('过多 fixed 项不能塞进一页时自动续页', () => {
    const docs = Array.from({ length: 4 }, (_, i) =>
      idCardDoc('d' + i, 'f' + i, 'b' + i)
    );
    const plans = compose({
      documents: docs,
      layout: layoutCfg({ type: 'multi', perPage: 1 }),
      watermark: wmCfg()
    });
    expect(plans.length).toBeGreaterThanOrEqual(1);
    // 每个 fixed item 严格 85.6×54
    for (const p of plans)
      for (const it of p.items)
        expect(it.wMm).toBeCloseTo(85.6, 3);
  });
});
