import { compose } from '../layout.js';
import { renderPage } from '../renderer.js';
import { mountCropper } from '../cropper.js';
import { toPng, toJpg, toPdf, printPlans } from '../exporter.js';

const PREVIEW_MM_PER_PX = 96 / 25.4 * 0.7;  // 屏幕约 0.7 倍打印尺寸

export function mountMiddlePanel({ root, store, imageStore }) {
  root.classList.add('panel', 'middle');

  const toolbar = document.createElement('div');
  toolbar.className = 'preview-toolbar';
  const previewStack = document.createElement('div');
  previewStack.className = 'preview-stack';
  const cropperWrap = document.createElement('div');
  cropperWrap.className = 'cropper-wrap';

  root.append(toolbar, cropperWrap, previewStack);

  let cropper = null;

  function activeSlot() {
    const s = store.getState();
    const doc = s.documents.find(d => d.id === s.activeDocId);
    if (!doc) return null;
    for (const name of Object.keys(doc.slots)) {
      if (doc.slots[name]) return { doc, slot: name, ref: doc.slots[name] };
    }
    return null;
  }

  function renderToolbar() {
    toolbar.replaceChildren();
    const sel = activeSlot();
    const exportBtn = (label, fn) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.onclick = () => Promise.resolve(fn()).catch(e => alert(e.message));
      return b;
    };
    const plans = computePlans();
    const disabled = plans.length === 0;

    const pdf = exportBtn('导出 PDF', () => toPdf({ plans, imageGetter: id => imageStore.get(id) }));
    const png = exportBtn('导出 PNG', () => toPng({ plans, imageGetter: id => imageStore.get(id) }));
    const jpg = exportBtn('导出 JPG', () => toJpg({ plans, imageGetter: id => imageStore.get(id) }));
    const prn = exportBtn('系统打印', () => printPlans({ plans, imageGetter: id => imageStore.get(id) }));
    for (const b of [pdf, png, jpg, prn]) b.disabled = disabled;
    toolbar.append(pdf, png, jpg, prn);

    if (sel) {
      const rot = document.createElement('button');
      rot.textContent = '旋转 90°';
      rot.onclick = () => {
        store.dispatch({
          type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
          patch: { rotateDeg: ((sel.ref.transform.rotateDeg || 0) + 90) % 360 }
        });
      };
      const reset = document.createElement('button');
      reset.textContent = '重置变换';
      reset.onclick = () => {
        store.dispatch({
          type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
          patch: { scale: 1, rotateDeg: 0, offsetX: 0, offsetY: 0, cropRect: null }
        });
      };
      const crop = document.createElement('button');
      crop.textContent = sel.ref.transform.cropRect ? '取消裁剪' : '开始裁剪';
      crop.onclick = () => {
        const entry = imageStore.get(sel.ref.imageId);
        if (!entry) return;
        const cur = sel.ref.transform.cropRect;
        if (cur) {
          store.dispatch({
            type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
            patch: { cropRect: null }
          });
        } else {
          // 初始裁剪框：取图像中心 80%
          const w = entry.naturalWidth * 0.8;
          const h = entry.naturalHeight * 0.8;
          store.dispatch({
            type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
            patch: { cropRect: { x: (entry.naturalWidth - w) / 2, y: (entry.naturalHeight - h) / 2, w, h } }
          });
        }
      };
      toolbar.append(rot, crop, reset);
    }
  }

  function renderCropper() {
    cropperWrap.replaceChildren();
    if (cropper) { cropper.destroy(); cropper = null; }
    const sel = activeSlot();
    if (!sel) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'cropper-canvas';
    cropperWrap.append(canvas);
    cropper = mountCropper({
      canvas,
      getEntry: () => imageStore.get(sel.ref.imageId),
      getTransform: () => store.getState().documents.find(d => d.id === sel.doc.id).slots[sel.slot].transform,
      onTransformChange: (patch) => {
        store.dispatch({
          type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot, patch
        });
      }
    });
    cropper.redraw();
  }

  function computePlans() {
    const s = store.getState();
    return compose({ documents: s.documents, layout: s.layout, watermark: s.watermark });
  }

  function renderPreview() {
    previewStack.replaceChildren();
    const plans = computePlans();
    const s = store.getState();
    const hint = document.createElement('div');
    hint.className = 'scale-hint';
    hint.textContent = plans.length
      ? `共 ${plans.length} 页 · 打印时请关闭"适合纸张大小"`
      : '从左侧选择证件、上传图片后预览将出现在这里';
    previewStack.append(hint);

    for (const plan of plans) {
      const c = renderPage(plan, {
        mmPerPx: PREVIEW_MM_PER_PX,
        imageGetter: (id) => imageStore.get(id),
        globalFilters: s.filters
      });
      c.className = 'preview-page';
      previewStack.append(c);
    }
  }

  function renderAll() {
    renderToolbar();
    renderCropper();
    renderPreview();
  }

  renderAll();
  store.subscribe(renderAll);
}
