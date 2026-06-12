import { A4, DOCUMENT_KINDS, DEFAULT_WATERMARK } from './constants.js';
import { compose } from './layout.js';
import { sanitizeTemplate } from './templateSchema.js';

export function runSelfTest() {
  const cases = [
    ['身份证默认锁定 1:1 且 85.6×54', () => {
      const k = DOCUMENT_KINDS.idCard;
      assertEq(k.sizeMode, 'fixed');
      assertEq(k.physicalSize.wMm, 85.6);
      assertEq(k.physicalSize.hMm, 54);
    }],
    ['stack 版式：身份证正反面 yMm 顺序正确', () => {
      const doc = {
        id: 'd', kind: 'idCard', sizeMode: 'fixed',
        physicalSize: { wMm: 85.6, hMm: 54 },
        slots: {
          front: { imageId: 'a', transform: {}, filters: {} },
          back:  { imageId: 'b', transform: {}, filters: {} }
        }
      };
      const [p] = compose({
        documents: [doc],
        layout: { type: 'stack', perPage: 1, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: true }
      });
      assertTrue(p.items[0].yMm < p.items[1].yMm);
      assertEq(round1(p.items[0].wMm), 85.6);
    }],
    ['multi 版式：5 个文档 perPage=3 → 2 页', () => {
      const docs = Array.from({ length: 5 }, (_, i) => ({
        id: 'd' + i, kind: 'idCard', sizeMode: 'fixed',
        physicalSize: { wMm: 85.6, hMm: 54 },
        slots: { front: { imageId: 'a', transform: {}, filters: {} }, back: null }
      }));
      const plans = compose({
        documents: docs,
        layout: { type: 'multi', perPage: 3, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: true }
      });
      assertEq(plans.length, 2);
    }],
    ['fit 类不放大：自然 50×30 在 stack 中仍为 50×30', () => {
      const doc = {
        id: 'tiny', kind: 'other', sizeMode: 'fit',
        physicalSize: { wMm: 50, hMm: 30 },
        slots: { front: { imageId: 'a', transform: {}, filters: {} } }
      };
      const [p] = compose({
        documents: [doc],
        layout: { type: 'stack', perPage: 1, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: false }
      });
      assertEq(round1(p.items[0].wMm), 50);
      assertEq(round1(p.items[0].hMm), 30);
    }],
    ['水印 enabled=false → PagePlan.watermark === null', () => {
      const doc = {
        id: 'd', kind: 'idCard', sizeMode: 'fixed',
        physicalSize: { wMm: 85.6, hMm: 54 },
        slots: { front: { imageId: 'a', transform: {}, filters: {} }, back: null }
      };
      const [p] = compose({
        documents: [doc],
        layout: { type: 'stack', perPage: 1, margin: 18 },
        watermark: { ...DEFAULT_WATERMARK, enabled: false }
      });
      assertEq(p.watermark, null);
    }],
    ['template schema：非法颜色被回退', () => {
      const t = sanitizeTemplate({
        name: 'x',
        watermark: { color: '<script>', opacity: 0.3 },
        layout: { type: 'stack' }, filters: {}
      });
      assertMatch(t.watermark.color, /^#[0-9a-f]{6}$/i);
    }],
    ['template schema：未知字段丢弃', () => {
      const t = sanitizeTemplate({
        evil: 1, name: 'x',
        watermark: { imageId: 'leak' }, layout: {}, filters: {}
      });
      assertEq('evil' in t, false);
      assertEq('imageId' in t.watermark, false);
    }],
    ['A4 = 210×297 mm', () => {
      assertEq(A4.wMm, 210);
      assertEq(A4.hMm, 297);
    }]
  ];

  const bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:9999;padding:8px;font-family:monospace;background:#fff;border-bottom:2px solid #ccc;max-height:40vh;overflow:auto';
  document.body.prepend(bar);

  let pass = 0, fail = 0;
  for (const [name, fn] of cases) {
    try {
      fn();
      const line = document.createElement('div');
      line.style.color = '#15803d';
      line.textContent = '✔ ' + name;
      bar.append(line);
      pass++;
    } catch (e) {
      const line = document.createElement('div');
      line.style.color = '#b91c1c';
      line.textContent = `✘ ${name}: ${e.message}`;
      bar.append(line);
      fail++;
    }
  }
  const sum = document.createElement('div');
  sum.style.fontWeight = '600';
  sum.style.marginTop = '4px';
  sum.textContent = `自检：通过 ${pass} / 失败 ${fail}`;
  bar.prepend(sum);
}

function assertEq(a, b) {
  if (a !== b) throw new Error(`期望 ${JSON.stringify(b)}，得到 ${JSON.stringify(a)}`);
}
function assertTrue(v) { if (!v) throw new Error('断言失败'); }
function assertMatch(s, re) { if (!re.test(String(s))) throw new Error(`不匹配 ${re} (${s})`); }
function round1(n) { return Math.round(n * 10) / 10; }
