import { renderPage } from './renderer.js';
import { MM_PER_PT } from './constants.js';

// pdf-lib 在浏览器中作为 window.PDFLib（UMD），构建脚本会内联
const getPDFLib = () => {
  if (typeof window !== 'undefined' && window.PDFLib) return window.PDFLib;
  throw new Error('pdf-lib 未加载');
};

function dpiToMmPerPx(dpi) {
  return dpi / 25.4;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function canvasToJpgBytes(canvas, quality = 0.92) {
  const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', quality));
  return new Uint8Array(await blob.arrayBuffer());
}

export async function toPng({ plans, imageGetter, dpi = 300, filename = 'id-copy.png' }) {
  if (!plans.length) throw new Error('请至少添加一张证件图');
  const mmPerPx = dpiToMmPerPx(dpi);
  // 多页 PNG：纵向拼接成一张大图
  const canvases = plans.map(p => renderPage(p, { mmPerPx, imageGetter }));
  const totalH = canvases.reduce((s, c) => s + c.height, 0);
  const w = canvases[0].width;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = totalH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, w, totalH);
  let y = 0;
  for (const c of canvases) {
    octx.drawImage(c, 0, y);
    y += c.height;
  }
  const blob = await new Promise(res => out.toBlob(res, 'image/png'));
  downloadBlob(blob, filename);
}

export async function toJpg({ plans, imageGetter, dpi = 300, quality = 0.92, filename = 'id-copy.jpg' }) {
  if (!plans.length) throw new Error('请至少添加一张证件图');
  const mmPerPx = dpiToMmPerPx(dpi);
  const canvases = plans.map(p => renderPage(p, { mmPerPx, imageGetter }));
  const totalH = canvases.reduce((s, c) => s + c.height, 0);
  const w = canvases[0].width;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = totalH;
  const octx = out.getContext('2d');
  octx.fillStyle = '#fff';
  octx.fillRect(0, 0, w, totalH);
  let y = 0;
  for (const c of canvases) { octx.drawImage(c, 0, y); y += c.height; }
  const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', quality));
  downloadBlob(blob, filename);
}

export async function toPdf({ plans, imageGetter, dpi = 300, filename = 'id-copy.pdf' }) {
  if (!plans.length) throw new Error('请至少添加一张证件图');
  const { PDFDocument } = getPDFLib();
  const mmPerPx = dpiToMmPerPx(dpi);

  const pdfDoc = await PDFDocument.create();
  for (const plan of plans) {
    const canvas = renderPage(plan, { mmPerPx, imageGetter });
    const jpgBytes = await canvasToJpgBytes(canvas, 0.92);
    const img = await pdfDoc.embedJpg(jpgBytes);

    const pageW = plan.pageSize.wMm / MM_PER_PT;  // mm → pt
    const pageH = plan.pageSize.hMm / MM_PER_PT;
    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
  }
  const bytes = await pdfDoc.save();
  downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}

// 调起系统打印对话框：把所有页面以 mm 为单位插入一个临时 iframe，应用 @page A4。
export function printPlans({ plans, imageGetter, dpi = 200 }) {
  if (!plans.length) {
    alert('请至少添加一张证件图');
    return;
  }
  const mmPerPx = dpiToMmPerPx(dpi);
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .page { width: 210mm; height: 297mm; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    img { display: block; width: 210mm; height: 297mm; }
  </style></head><body></body></html>`);
  doc.close();

  for (const plan of plans) {
    const canvas = renderPage(plan, { mmPerPx, imageGetter });
    const div = doc.createElement('div');
    div.className = 'page';
    const img = doc.createElement('img');
    img.src = canvas.toDataURL('image/png');
    div.appendChild(img);
    doc.body.appendChild(div);
  }

  setTimeout(() => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => iframe.remove(), 1000);
  }, 200);
}
