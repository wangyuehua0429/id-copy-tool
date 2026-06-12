import { describe, it, expect } from 'vitest';
import {
  A4, DOCUMENT_KINDS, DEFAULT_WATERMARK, DEFAULT_LAYOUT, DEFAULT_FILTERS, PT_PER_MM
} from '../src/constants.js';

describe('constants', () => {
  it('A4 是 210×297 mm', () => {
    expect(A4).toEqual({ wMm: 210, hMm: 297 });
  });

  it('身份证类全部锁定 1:1 且 85.6×54', () => {
    for (const k of ['idCard', 'drivingLicense', 'hkMacau']) {
      expect(DOCUMENT_KINDS[k].sizeMode).toBe('fixed');
      expect(DOCUMENT_KINDS[k].physicalSize).toEqual({ wMm: 85.6, hMm: 54 });
    }
  });

  it('护照锁定 1:1 且 125×88', () => {
    expect(DOCUMENT_KINDS.passport.sizeMode).toBe('fixed');
    expect(DOCUMENT_KINDS.passport.physicalSize).toEqual({ wMm: 125, hMm: 88 });
  });

  it('营业执照、学历、荣誉、资质均为 fit', () => {
    for (const k of ['businessLicense', 'diploma', 'award', 'qualification', 'other']) {
      expect(DOCUMENT_KINDS[k].sizeMode).toBe('fit');
    }
  });

  it('默认水印开启、对角 -30 度', () => {
    expect(DEFAULT_WATERMARK.enabled).toBe(true);
    expect(DEFAULT_WATERMARK.angleDeg).toBe(-30);
    expect(DEFAULT_WATERMARK.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('PDF 单位换算正确（1 mm ≈ 2.8346 pt）', () => {
    expect(PT_PER_MM).toBeCloseTo(72 / 25.4, 3);
  });
});
