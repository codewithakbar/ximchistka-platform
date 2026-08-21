import { describe, expect, it } from 'vitest';
import {
  DEFAULT_RECEIPT_SETTINGS,
  normalizeReceiptSettings,
} from './index';

describe('normalizeReceiptSettings', () => {
  it('bo\'sh yoki noto\'g\'ri kirish standartga tushadi', () => {
    expect(normalizeReceiptSettings(null)).toEqual(DEFAULT_RECEIPT_SETTINGS);
    expect(normalizeReceiptSettings(undefined)).toEqual(DEFAULT_RECEIPT_SETTINGS);
    expect(normalizeReceiptSettings('qator')).toEqual(DEFAULT_RECEIPT_SETTINGS);
    expect(normalizeReceiptSettings(42)).toEqual(DEFAULT_RECEIPT_SETTINGS);
  });

  it('to\'g\'ri qiymatlar saqlanadi', () => {
    const result = normalizeReceiptSettings({
      paperWidth: 58,
      fontScale: 'large',
      headerText: '  INN 123  ',
      footerText: 'Rahmat!',
      showQr: false,
      showNotes: false,
    });
    expect(result).toEqual({
      paperWidth: 58,
      fontScale: 'large',
      headerText: 'INN 123',
      footerText: 'Rahmat!',
      showQr: false,
      showNotes: false,
    });
  });

  it('yaroqsiz qog\'oz eni va shrift standartga tushadi', () => {
    const result = normalizeReceiptSettings({ paperWidth: 72, fontScale: 'huge' });
    expect(result.paperWidth).toBe(80);
    expect(result.fontScale).toBe('normal');
  });

  it('matnlar uzunligi cheklanadi', () => {
    const result = normalizeReceiptSettings({
      headerText: 'a'.repeat(500),
      footerText: 'b'.repeat(500),
    });
    expect(result.headerText).toHaveLength(200);
    expect(result.footerText).toHaveLength(300);
  });

  it('matn bo\'lmagan qiymatlar bo\'sh satrga aylanadi', () => {
    const result = normalizeReceiptSettings({ headerText: 99, footerText: {} });
    expect(result.headerText).toBe('');
    expect(result.footerText).toBe('');
  });

  it('boolean bo\'lmagan bayroqlar standartda qoladi', () => {
    const result = normalizeReceiptSettings({ showQr: 'yes', showNotes: 1 });
    expect(result.showQr).toBe(true);
    expect(result.showNotes).toBe(true);
  });
});
