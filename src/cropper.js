// mountCropper({
//   canvas,           // HTMLCanvasElement
//   getEntry,         // () → imageStore entry or null
//   getTransform,     // () → transform
//   onTransformChange // (patch) => void
// }) → { redraw(), destroy() }
//
// 交互：
//   - 拖拽画布：平移图像（更新 transform.offsetX/Y）
//   - 滚轮：缩放图像（更新 transform.scale）
//   - 拖动 4 角 + 4 边中点：调整 transform.cropRect（源图坐标系）
//   - 旋转、滤镜由外部按钮控制并通过 onTransformChange 触发 redraw

const HANDLE = 14;
const EDGE_HANDLE = 8;

export function mountCropper({ canvas, getEntry, getTransform, onTransformChange, isEditing }) {
  const ctx = canvas.getContext('2d');
  let dragging = null;     // 'move' | { handle: 'tl'|'tr'|'bl'|'br' }
  let lastPt = null;

  function viewSize() { return { w: canvas.clientWidth, h: canvas.clientHeight }; }
  function syncBackingStore() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = canvas.clientWidth  * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function imageDisplayRect() {
    // 把源图按 "contain" 适配到画布；transform.scale/offset 在此基础上叠加
    const entry = getEntry();
    if (!entry) return null;
    const { w: vw, h: vh } = viewSize();
    const ratio = Math.min(vw / entry.naturalWidth, vh / entry.naturalHeight);
    const w = entry.naturalWidth * ratio;
    const h = entry.naturalHeight * ratio;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;
    return { x, y, w, h, ratio };
  }

  function redraw() {
    syncBackingStore();
    const { w: vw, h: vh } = viewSize();
    ctx.clearRect(0, 0, vw, vh);
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, vw, vh);

    const entry = getEntry();
    if (!entry) return;
    const t = getTransform();
    const base = imageDisplayRect();
    if (!base) return;

    ctx.save();
    const cx = base.x + base.w / 2 + (t.offsetX || 0);
    const cy = base.y + base.h / 2 + (t.offsetY || 0);
    ctx.translate(cx, cy);
    ctx.rotate((t.rotateDeg || 0) * Math.PI / 180);
    ctx.scale(t.scale || 1, t.scale || 1);
    ctx.drawImage(entry.bitmap, -base.w / 2, -base.h / 2, base.w, base.h);
    ctx.restore();

    if (t.cropRect && isEditing && isEditing()) drawCropFrame(t.cropRect, base);
  }

  function drawCropFrame(crop, base) {
    const { ratio } = base;
    const x = base.x + crop.x * ratio;
    const y = base.y + crop.y * ratio;
    const w = crop.w * ratio;
    const h = crop.h * ratio;

    // 半透明遮罩 + 中间镂空
    const { w: vw, h: vh } = viewSize();
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(0, 0, vw, vh);
    ctx.clearRect(x, y, w, h);

    // 边框
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // 4 角手柄
    for (const [hx, hy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(hx - HANDLE / 2, hy - HANDLE / 2, HANDLE, HANDLE);
    }
    // 4 边中点手柄
    const edgePts = [
      [x + w / 2, y],          // top
      [x + w / 2, y + h],      // bottom
      [x, y + h / 2],          // left
      [x + w, y + h / 2],      // right
    ];
    for (const [ex, ey] of edgePts) {
      ctx.fillStyle = '#facc15';
      ctx.fillRect(ex - EDGE_HANDLE / 2, ey - EDGE_HANDLE / 2, EDGE_HANDLE, EDGE_HANDLE);
    }
    ctx.restore();
  }

  function hitHandle(px, py) {
    if (!isEditing || !isEditing()) return null;
    const t = getTransform();
    if (!t.cropRect) return null;
    const base = imageDisplayRect();
    if (!base) return null;
    const { ratio } = base;
    const x = base.x + t.cropRect.x * ratio;
    const y = base.y + t.cropRect.y * ratio;
    const w = t.cropRect.w * ratio;
    const h = t.cropRect.h * ratio;
    // 角手柄
    const corners = { tl: [x, y], tr: [x + w, y], bl: [x, y + h], br: [x + w, y + h] };
    for (const [name, [hx, hy]] of Object.entries(corners)) {
      if (Math.abs(px - hx) < HANDLE && Math.abs(py - hy) < HANDLE) return name;
    }
    // 边中点手柄
    const edges = { top: [x + w / 2, y], bottom: [x + w / 2, y + h], left: [x, y + h / 2], right: [x + w, y + h / 2] };
    for (const [name, [ex, ey]] of Object.entries(edges)) {
      if (Math.abs(px - ex) < EDGE_HANDLE + 2 && Math.abs(py - ey) < EDGE_HANDLE + 2) return name;
    }
    return null;
  }

  function ptFromEvent(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onDown(e) {
    const p = ptFromEvent(e);
    const handle = hitHandle(p.x, p.y);
    dragging = handle ? { handle } : 'move';
    lastPt = p;
    canvas.style.cursor = handle ? (CURSOR_MAP[handle] || 'move') : 'grabbing';
    canvas.setPointerCapture(e.pointerId);
  }
  const CURSOR_MAP = {
    tl: 'nw-resize', tr: 'ne-resize', bl: 'sw-resize', br: 'se-resize',
    top: 'n-resize', bottom: 's-resize', left: 'w-resize', right: 'e-resize'
  };

  function onMove(e) {
    const p = ptFromEvent(e);
    if (!dragging) {
      const h = hitHandle(p.x, p.y);
      canvas.style.cursor = h ? (CURSOR_MAP[h] || 'move') : 'grab';
      return;
    }
    const dx = p.x - lastPt.x;
    const dy = p.y - lastPt.y;
    lastPt = p;

    if (dragging === 'move') {
      const t = getTransform();
      onTransformChange({ offsetX: (t.offsetX || 0) + dx, offsetY: (t.offsetY || 0) + dy });
    } else {
      const t = getTransform();
      const base = imageDisplayRect();
      if (!t.cropRect || !base) return;
      const r = { ...t.cropRect };
      const sx = dx / base.ratio;
      const sy = dy / base.ratio;
      switch (dragging.handle) {
        case 'tl': r.x += sx; r.y += sy; r.w -= sx; r.h -= sy; break;
        case 'tr': r.y += sy; r.w += sx; r.h -= sy; break;
        case 'bl': r.x += sx; r.w -= sx; r.h += sy; break;
        case 'br': r.w += sx; r.h += sy; break;
        case 'top': r.y += sy; r.h -= sy; break;
        case 'bottom': r.h += sy; break;
        case 'left': r.x += sx; r.w -= sx; break;
        case 'right': r.w += sx; break;
      }
      r.w = Math.max(20, r.w);
      r.h = Math.max(20, r.h);
      onTransformChange({ cropRect: r });
    }
  }
  function onUp(e) {
    dragging = null;
    lastPt = null;
    canvas.style.cursor = '';
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
  }
  function onWheel(e) {
    e.preventDefault();
    const t = getTransform();
    const factor = e.deltaY < 0 ? 1.05 : 0.95;
    const next = Math.max(0.2, Math.min(8, (t.scale || 1) * factor));
    onTransformChange({ scale: next });
  }

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    redraw,
    destroy() {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('wheel', onWheel);
    }
  };
}
