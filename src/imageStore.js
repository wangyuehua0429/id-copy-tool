const OK_MIME = /^image\/(jpeg|png|webp|heic|heif)$/i;
const MAX_PX = 4000;

let _seq = 0;
const nextId = () => `img_${++_seq}`;

async function loadBitmap(file) {
  let bmp;
  try {
    bmp = await createImageBitmap(file);
  } catch (e) {
    throw new Error('浏览器无法解码该图片（HEIC 等格式请先转 JPG/PNG）');
  }
  // 超大图按 MAX_PX 降采样
  if (bmp.width > MAX_PX || bmp.height > MAX_PX) {
    const ratio = MAX_PX / Math.max(bmp.width, bmp.height);
    const targetW = Math.round(bmp.width * ratio);
    const targetH = Math.round(bmp.height * ratio);
    const resized = await createImageBitmap(bmp, {
      resizeWidth: targetW, resizeHeight: targetH, resizeQuality: 'high'
    });
    bmp.close && bmp.close();
    return { bitmap: resized, naturalWidth: targetW, naturalHeight: targetH };
  }
  return { bitmap: bmp, naturalWidth: bmp.width, naturalHeight: bmp.height };
}

export function createImageStore() {
  const map = new Map();   // id → { id, url, bitmap, naturalWidth, naturalHeight }

  async function add(file) {
    if (!file || !OK_MIME.test(file.type)) {
      throw new Error('请选择图片文件（JPG / PNG / WebP / HEIC）');
    }
    const { bitmap, naturalWidth, naturalHeight } = await loadBitmap(file);
    const id = nextId();
    const url = URL.createObjectURL(file);
    const entry = { id, url, bitmap, naturalWidth, naturalHeight };
    map.set(id, entry);
    return entry;
  }

  function get(id) { return map.get(id) || null; }

  function remove(id) {
    const e = map.get(id);
    if (!e) return;
    URL.revokeObjectURL(e.url);
    e.bitmap.close && e.bitmap.close();
    map.delete(id);
  }

  function clear() {
    for (const id of [...map.keys()]) remove(id);
  }

  return { add, get, remove, clear };
}
