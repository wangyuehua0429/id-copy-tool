import { A4 } from './constants.js';

// 版面各元素之间的默认间距（毫米）；layout.gap 可覆盖
const DEFAULT_GAP_MM = 6;
const resolveGap = (layout) => {
  const g = Number(layout?.gap);
  return Number.isFinite(g) && g >= 0 ? g : DEFAULT_GAP_MM;
};

// items: 拆解 documents → 平铺的渲染单元，保留 fixed/fit 标记
function flatten(documents) {
  const out = [];
  for (const d of documents) {
    for (const slotName of Object.keys(d.slots)) {
      const slot = d.slots[slotName];
      if (!slot) continue;
      out.push({
        docId: d.id,
        slot: slotName,
        kind: d.kind,
        sizeMode: d.sizeMode,
        physicalSize: d.physicalSize,
        sourceId: slot.imageId,
        transform: slot.transform,
        filters: slot.filters
      });
    }
  }
  return out;
}

function newPage(watermark) {
  return { pageSize: { ...A4 }, items: [], watermark };
}

function attachWm(watermark) {
  return watermark && watermark.enabled ? { ...watermark } : null;
}

function sizeForItem(it, availW, availH) {
  if (it.sizeMode === 'fixed') {
    return { wMm: it.physicalSize.wMm, hMm: it.physicalSize.hMm };
  }
  // fit：按可用空间等比缩放，但不超过自然尺寸
  const ratio = Math.min(availW / it.physicalSize.wMm, availH / it.physicalSize.hMm, 1);
  return {
    wMm: it.physicalSize.wMm * ratio,
    hMm: it.physicalSize.hMm * ratio
  };
}

function composeStack({ flat, layout, wm }) {
  const margin = layout.margin;
  const gap = resolveGap(layout);
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;

  const sized = flat.map(it => ({ ...it, ...sizeForItem(it, innerW, innerH) }));

  const pages = [];
  let cur = newPage(attachWm(wm));
  let used = 0;
  for (const it of sized) {
    const needed = it.hMm + (cur.items.length ? gap : 0);
    if (used + needed > innerH && cur.items.length) {
      pages.push(cur);
      cur = newPage(attachWm(wm));
      used = 0;
    }
    cur.items.push({
      sourceId: it.sourceId, docId: it.docId, slot: it.slot,
      transform: it.transform, filters: it.filters,
      xMm: margin + (innerW - it.wMm) / 2,
      yMm: margin + used,
      wMm: it.wMm, hMm: it.hMm
    });
    used += needed;
  }
  if (cur.items.length) pages.push(cur);
  return pages;
}

function composeSide({ flat, layout, wm }) {
  // 两列布局：左列放奇数序号项，右列放偶数；每行高度 = 该行两项中较大者
  const margin = layout.margin;
  const gap = resolveGap(layout);
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;
  const colW = (innerW - gap) / 2;

  const sized = flat.map(it => ({ ...it, ...sizeForItem(it, colW, innerH) }));

  const pages = [];
  let cur = newPage(attachWm(wm));
  let cursorY = 0;
  for (let i = 0; i < sized.length; i += 2) {
    const left = sized[i];
    const right = sized[i + 1];
    const rowH = Math.max(left.hMm, right ? right.hMm : 0);
    if (cursorY + rowH > innerH && cur.items.length) {
      pages.push(cur);
      cur = newPage(attachWm(wm));
      cursorY = 0;
    }
    cur.items.push({
      sourceId: left.sourceId, docId: left.docId, slot: left.slot,
      transform: left.transform, filters: left.filters,
      xMm: margin + (colW - left.wMm) / 2,
      yMm: margin + cursorY,
      wMm: left.wMm, hMm: left.hMm
    });
    if (right) {
      cur.items.push({
        sourceId: right.sourceId, docId: right.docId, slot: right.slot,
        transform: right.transform, filters: right.filters,
        xMm: margin + colW + gap + (colW - right.wMm) / 2,
        yMm: margin + cursorY,
        wMm: right.wMm, hMm: right.hMm
      });
    }
    cursorY += rowH + gap;
  }
  if (cur.items.length) pages.push(cur);
  return pages;
}

// 把一组"按行排列的文档"绘制到一张新页上。chunk 元素是数组（一个 doc 的所有 slot）。
function composeChunkToPage(chunk, { margin, innerW, innerH, wm, gap }) {
  const cur = newPage(attachWm(wm));
  const rowH = (innerH - gap * (chunk.length - 1)) / chunk.length;
  chunk.forEach((docItems, rowIdx) => {
    const rowY = margin + rowIdx * (rowH + gap);
    // 同 doc 的 slot 横向排开
    const slotW = (innerW - gap * (docItems.length - 1)) / docItems.length;
    docItems.forEach((it, colIdx) => {
      const { wMm, hMm } = sizeForItem(it, slotW, rowH);
      const slotX = margin + colIdx * (slotW + gap);
      cur.items.push({
        sourceId: it.sourceId, docId: it.docId, slot: it.slot,
        transform: it.transform, filters: it.filters,
        xMm: slotX + (slotW - wMm) / 2,
        yMm: rowY + (rowH - hMm) / 2,
        wMm, hMm
      });
    });
  });
  return cur;
}

function composeMulti({ flat, layout, wm }) {
  // perPage = 每页"份数"。一份 = 同一 docId 的所有 slot。
  const perPage = Math.max(1, Math.trunc(layout.perPage) || 1);
  const margin = layout.margin;
  const gap = resolveGap(layout);
  const innerW = A4.wMm - 2 * margin;
  const innerH = A4.hMm - 2 * margin;
  const pageCtx = { margin, innerW, innerH, wm, gap };

  // 按 doc 分组，保留 doc 顺序
  const byDoc = [];
  const seen = new Map();
  for (const it of flat) {
    if (!seen.has(it.docId)) {
      seen.set(it.docId, byDoc.length);
      byDoc.push([]);
    }
    byDoc[seen.get(it.docId)].push(it);
  }

  // 单文档 + perPage>1 = 用户希望在一页上印 N 份该证件（复印常见用法），因此复制到 perPage 份
  if (byDoc.length === 1 && perPage > 1) {
    const single = byDoc[0];
    const chunk = Array.from({ length: perPage }, () => single);
    return [composeChunkToPage(chunk, pageCtx)];
  }

  // 多文档：perPage = "单页最多放的文档数"。最后一页若不足，保留实际数量，不复制、不补空
  const pages = [];
  for (let i = 0; i < byDoc.length; i += perPage) {
    const chunk = byDoc.slice(i, i + perPage);
    pages.push(composeChunkToPage(chunk, pageCtx));
  }
  return pages;
}

export function compose({ documents, layout, watermark }) {
  if (!documents || documents.length === 0) return [];
  const flat = flatten(documents);
  if (flat.length === 0) return [];
  switch (layout.type) {
    case 'side':  return composeSide({ flat, layout, wm: watermark });
    case 'multi': return composeMulti({ flat, layout, wm: watermark });
    case 'stack':
    default:      return composeStack({ flat, layout, wm: watermark });
  }
}
