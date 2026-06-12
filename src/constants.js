export const A4 = { wMm: 210, hMm: 297 };

export const PT_PER_MM = 72 / 25.4;  // pdf-lib 用 pt；1 inch = 25.4 mm = 72 pt

const idCardSize  = { wMm: 85.6, hMm: 54 };
const passportSize = { wMm: 125,  hMm: 88 };

export const DOCUMENT_KINDS = {
  idCard:          { label: '身份证',       sizeMode: 'fixed', physicalSize: { ...idCardSize }, slots: ['front', 'back'] },
  drivingLicense:  { label: '驾驶证',       sizeMode: 'fixed', physicalSize: { ...idCardSize }, slots: ['front', 'back'] },
  hkMacau:         { label: '港澳通行证',   sizeMode: 'fixed', physicalSize: { ...idCardSize }, slots: ['front', 'back'] },
  passport:        { label: '护照内页',     sizeMode: 'fixed', physicalSize: { ...passportSize }, slots: ['front'] },
  businessLicense: { label: '营业执照',     sizeMode: 'fit',   physicalSize: { wMm: 297, hMm: 420 }, slots: ['front'] },
  diploma:         { label: '学历/学位证',  sizeMode: 'fit',   physicalSize: { wMm: 297, hMm: 210 }, slots: ['front'] },
  award:           { label: '荣誉证书',     sizeMode: 'fit',   physicalSize: { wMm: 285, hMm: 210 }, slots: ['front'] },
  qualification:   { label: '资质证书',     sizeMode: 'fit',   physicalSize: { wMm: 210, hMm: 297 }, slots: ['front'] },
  other:           { label: '其他',         sizeMode: 'fit',   physicalSize: { wMm: 210, hMm: 297 }, slots: ['front'] }
};

export const DEFAULT_WATERMARK = {
  enabled: true,
  text: '仅供{project}投标使用\n{date}',
  project: '某某项目',
  color: '#dc2626',
  opacity: 0.35,
  fontSize: 14,
  lineHeight: 1.2,
  angleDeg: -30,
  gapX: 80,
  gapY: 60,
  includeDate: true
};

export const DEFAULT_LAYOUT = {
  type: 'stack',     // stack | side | multi
  perPage: 1,
  margin: 18,        // mm
  gap: 6,            // mm，不同证件之间的间距
  slotGap: 6         // mm，同一证件正反面之间的间距
};

export const DEFAULT_FILTERS = {
  grayscale: false,
  contrast: 1.0,
  brightness: 1.0
};

export const DEFAULT_TRANSFORM = {
  scale: 1,
  rotateDeg: 0,
  offsetX: 0,
  offsetY: 0,
  cropRect: null     // null = 不裁剪；否则 { x, y, w, h }（在原图像素坐标系）
};
