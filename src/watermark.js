const MAX_TEXT = 200;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fmtDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
};

export function resolveText(config, dateNow = new Date()) {
  const date = config.includeDate ? fmtDate(dateNow) : '';
  const project = config.project || '';
  const raw = String(config.text || '')
    .replaceAll('{project}', project)
    .replaceAll('{date}', date);
  return raw.slice(0, MAX_TEXT);
}

export function drawTo(ctx, config, pageSizeMm, mmPerPx, dateNow = new Date()) {
  const text = resolveText(config, dateNow);
  if (!text) return;

  const opacity  = clamp(Number(config.opacity)  || 0,   0, 1);
  const fontSize = clamp(Number(config.fontSize) || 12,  6, 200);
  const angle    = clamp(Number(config.angleDeg) || 0, -90, 90);
  const gapX     = clamp(Number(config.gapX)     || 80, 20, 800);
  const gapY     = clamp(Number(config.gapY)     || 60, 20, 800);

  const pageWpx = pageSizeMm.wMm * mmPerPx;
  const pageHpx = pageSizeMm.hMm * mmPerPx;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = config.color || '#dc2626';
  ctx.font = `600 ${fontSize}px -apple-system, "Helvetica Neue", "PingFang SC", sans-serif`;
  ctx.textBaseline = 'middle';

  ctx.translate(pageWpx / 2, pageHpx / 2);
  ctx.rotate(angle * Math.PI / 180);

  const diag = Math.hypot(pageWpx, pageHpx);
  const halfDiag = diag / 2;
  const textWidth = ctx.measureText(text).width;

  for (let y = -halfDiag; y <= halfDiag; y += gapY) {
    for (let x = -halfDiag - textWidth; x <= halfDiag; x += gapX + textWidth) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();
}
