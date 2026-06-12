import { drawTo as drawWatermark } from './watermark.js';

// renderPage(plan, { mmPerPx, imageGetter, globalFilters, dateNow }) → HTMLCanvasElement
export function renderPage(plan, { mmPerPx, imageGetter, globalFilters = null, dateNow = new Date() }) {
  const canvas = document.createElement('canvas');
  canvas.width  = Math.round(plan.pageSize.wMm * mmPerPx);
  canvas.height = Math.round(plan.pageSize.hMm * mmPerPx);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';

  // 纸张底色
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const item of plan.items) {
    drawItem(ctx, item, imageGetter, mmPerPx, globalFilters);
  }

  if (plan.watermark) {
    drawWatermark(ctx, plan.watermark, plan.pageSize, mmPerPx, dateNow);
  }

  return canvas;
}

function drawItem(ctx, item, imageGetter, mmPerPx, globalFilters) {
  const entry = imageGetter(item.sourceId);
  if (!entry || !entry.bitmap) {
    // 占位框，便于发现丢失资源
    ctx.save();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(item.xMm * mmPerPx, item.yMm * mmPerPx, item.wMm * mmPerPx, item.hMm * mmPerPx);
    ctx.restore();
    return;
  }

  const dx = item.xMm * mmPerPx;
  const dy = item.yMm * mmPerPx;
  const dw = item.wMm * mmPerPx;
  const dh = item.hMm * mmPerPx;

  const t = { scale: 1, rotateDeg: 0, offsetX: 0, offsetY: 0, cropRect: null, ...item.transform };
  const fLocal = { brightness: 1, contrast: 1, grayscale: false, ...item.filters };
  const f = {
    brightness: fLocal.brightness * (globalFilters?.brightness ?? 1),
    contrast:   fLocal.contrast   * (globalFilters?.contrast   ?? 1),
    grayscale:  fLocal.grayscale || (globalFilters?.grayscale ?? false)
  };

  // 源裁剪
  const src = t.cropRect
    ? { x: t.cropRect.x, y: t.cropRect.y, w: t.cropRect.w, h: t.cropRect.h }
    : { x: 0, y: 0, w: entry.naturalWidth, h: entry.naturalHeight };

  ctx.save();
  // 限制绘制范围到目标矩形（避免旋转后越界覆盖其他 item）
  ctx.beginPath();
  ctx.rect(dx, dy, dw, dh);
  ctx.clip();

  // 应用 filter（CSS filter on Canvas — Chrome/Edge/Safari/Firefox 都支持）
  const filterParts = [];
  if (f.brightness !== 1) filterParts.push(`brightness(${f.brightness})`);
  if (f.contrast   !== 1) filterParts.push(`contrast(${f.contrast})`);
  if (f.grayscale)        filterParts.push('grayscale(1)');
  ctx.filter = filterParts.length ? filterParts.join(' ') : 'none';

  // 平移到目标中心，旋转，绘制
  ctx.translate(dx + dw / 2 + t.offsetX, dy + dh / 2 + t.offsetY);
  ctx.rotate((t.rotateDeg || 0) * Math.PI / 180);
  ctx.scale(t.scale || 1, t.scale || 1);

  ctx.drawImage(
    entry.bitmap,
    src.x, src.y, src.w, src.h,
    -dw / 2, -dh / 2, dw, dh
  );

  ctx.restore();
}
