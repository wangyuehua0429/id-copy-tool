// bindUploadZone(el, { onFile, accept = 'image/*', multiple = true }) → { destroy() }
export function bindUploadZone(el, { onFile, accept = 'image/*', multiple = true }) {
  if (!el || typeof onFile !== 'function') {
    throw new Error('bindUploadZone: el 与 onFile 必填');
  }

  // 隐藏的 <input type="file">，由 el 的 click 触发
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = accept;
  fileInput.multiple = multiple;
  fileInput.style.display = 'none';
  el.appendChild(fileInput);

  function emit(files) {
    for (const f of files) {
      if (!f.type.startsWith('image/')) continue;
      Promise.resolve(onFile(f)).catch(err => alertOnce(err.message));
    }
  }

  function onClick() { fileInput.click(); }
  function onFileInput() {
    emit(fileInput.files);
    fileInput.value = '';
  }
  function onDragOver(e) {
    e.preventDefault();
    el.classList.add('is-dragging');
  }
  function onDragLeave() { el.classList.remove('is-dragging'); }
  function onDrop(e) {
    e.preventDefault();
    el.classList.remove('is-dragging');
    if (e.dataTransfer && e.dataTransfer.files) emit(e.dataTransfer.files);
  }
  function onPaste(e) {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;
    const files = [];
    for (const it of items) {
      if (it.kind === 'file') {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) emit(files);
  }

  el.addEventListener('click', onClick);
  fileInput.addEventListener('change', onFileInput);
  el.addEventListener('dragover', onDragOver);
  el.addEventListener('dragleave', onDragLeave);
  el.addEventListener('drop', onDrop);
  window.addEventListener('paste', onPaste);

  return {
    destroy() {
      el.removeEventListener('click', onClick);
      fileInput.removeEventListener('change', onFileInput);
      el.removeEventListener('dragover', onDragOver);
      el.removeEventListener('dragleave', onDragLeave);
      el.removeEventListener('drop', onDrop);
      window.removeEventListener('paste', onPaste);
      fileInput.remove();
    }
  };
}

let _alerted = '';
function alertOnce(msg) {
  if (msg === _alerted) return;
  _alerted = msg;
  setTimeout(() => (_alerted = ''), 2000);
  alert(msg);
}
