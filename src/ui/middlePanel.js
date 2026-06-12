import { compose } from '../layout.js';
import { renderPage } from '../renderer.js';
import { mountCropper } from '../cropper.js';
import { toPng, toJpg, toPdf, printPlans } from '../exporter.js';

const PREVIEW_MM_PER_PX = 96 / 25.4 * 0.7;  // 屏幕约 0.7 倍打印尺寸

export function mountMiddlePanel({ root, store, imageStore }) {
  root.classList.add('panel', 'middle');

  const toolbar = document.createElement('div');
  toolbar.className = 'preview-toolbar';
  const slotSwitcher = document.createElement('div');
  slotSwitcher.className = 'slot-switcher';
  const previewStack = document.createElement('div');
  previewStack.className = 'preview-stack';
  const cropperWrap = document.createElement('div');
  cropperWrap.className = 'cropper-wrap';

  root.append(toolbar, slotSwitcher, cropperWrap, previewStack);

  let cropper = null;
  let lastCropperKey = null;
  let isEditingCrop = false;

  function activeSlot() {
    const s = store.getState();
    const doc = s.documents.find(d => d.id === s.activeDocId);
    if (!doc) return null;
    if (s.activeSlotName && doc.slots[s.activeSlotName]) {
      return { doc, slot: s.activeSlotName, ref: doc.slots[s.activeSlotName] };
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

    const globalFilters = store.getState().filters;
    const pdf = exportBtn('导出 PDF', () => toPdf({ plans, imageGetter: id => imageStore.get(id), globalFilters }));
    pdf.classList.add('primary');
    const png = exportBtn('导出 PNG', () => toPng({ plans, imageGetter: id => imageStore.get(id), globalFilters }));
    const jpg = exportBtn('导出 JPG', () => toJpg({ plans, imageGetter: id => imageStore.get(id), globalFilters }));
    const prn = exportBtn('系统打印', () => printPlans({ plans, imageGetter: id => imageStore.get(id), globalFilters }));
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
      const curCrop = sel.ref.transform.cropRect;
      const crop = document.createElement('button');
      if (curCrop && isEditingCrop) {
        // 编辑中：确定 + 取消
        crop.textContent = '确定';
        crop.className = 'primary';
        crop.onclick = () => {
          isEditingCrop = false;
          store.dispatch({ type: 'DOC_SET_SIZE_MODE', docId: sel.doc.id, mode: 'fit' });
          renderAll();
        };
        toolbar.append(rot, crop);
        const cancelBtn = document.createElement('button');
        cancelBtn.textContent = '取消';
        cancelBtn.onclick = () => {
          isEditingCrop = false;
          store.dispatch({ type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot, patch: { cropRect: null } });
        };
        toolbar.append(cancelBtn);
      } else if (curCrop && !isEditingCrop) {
        // 已确认裁剪：重新裁剪 + 取消裁剪
        crop.textContent = '重新裁剪';
        crop.onclick = () => { isEditingCrop = true; renderAll(); };
        toolbar.append(rot, crop);
        const removeBtn = document.createElement('button');
        removeBtn.textContent = '取消裁剪';
        removeBtn.onclick = () => {
          store.dispatch({ type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot, patch: { cropRect: null } });
        };
        toolbar.append(removeBtn);
      } else {
        // 无裁剪：开始裁剪
        crop.textContent = '开始裁剪';
        crop.onclick = () => {
          const entry = imageStore.get(sel.ref.imageId);
          if (!entry) return;
          const w = entry.naturalWidth * 0.8;
          const h = entry.naturalHeight * 0.8;
          isEditingCrop = true;
          store.dispatch({ type: 'DOC_SET_SLOT_TRANSFORM', docId: sel.doc.id, slot: sel.slot,
            patch: { cropRect: { x: (entry.naturalWidth - w) / 2, y: (entry.naturalHeight - h) / 2, w, h } } });
        };
        toolbar.append(rot, crop);
      }
      toolbar.append(reset);
    }
  }

  function renderCropper() {
    const sel = activeSlot();
    const key = sel ? `${sel.doc.id}/${sel.slot}` : null;
    if (key !== lastCropperKey) isEditingCrop = false;
    if (key === lastCropperKey && cropper) {
      cropper.redraw();
      return;
    }
    cropperWrap.replaceChildren();
    if (cropper) { cropper.destroy(); cropper = null; }
    lastCropperKey = key;
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
      },
      isEditing: () => isEditingCrop
    });
    cropper.redraw();
  }

  function renderSlotSwitcher() {
    slotSwitcher.replaceChildren();
    const s = store.getState();
    const doc = s.documents.find(d => d.id === s.activeDocId);
    if (!doc) return;

    const SLOT_LABEL = { front: '正面', back: '背面' };
    const slotLabel = (name) => SLOT_LABEL[name] || name;

    for (const name of Object.keys(doc.slots)) {
      const slot = doc.slots[name];
      const thumb = document.createElement('div');
      thumb.className = 'slot-switch-thumb' + (s.activeSlotName === name ? ' active' : '');
      thumb.title = slotLabel(name);
      thumb.onclick = (e) => {
        e.stopPropagation();
        store.dispatch({ type: 'ACTIVE_SLOT_SET', slotName: name });
      };

      if (slot) {
        const entry = imageStore.get(slot.imageId);
        if (entry) {
          const img = document.createElement('img');
          img.src = entry.url;
          thumb.append(img);
        }
      }

      const label = document.createElement('span');
      label.textContent = slotLabel(name);
      thumb.append(label);
      slotSwitcher.append(thumb);
    }
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
    renderSlotSwitcher();
    renderCropper();
    renderPreview();
  }

  renderAll();
  store.subscribe(renderAll);
}
