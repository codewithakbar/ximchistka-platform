import { describe, expect, it } from 'vitest';
import {
  applyServiceDiscount,
  discountLabel,
  isServiceDiscountActive,
} from './index';

const NEVER = null;
const TOMORROW = new Date(Date.now() + 86400000);
const YESTERDAY = new Date(Date.now() - 86400000);

describe('isServiceDiscountActive', () => {
  it('chegirma turi yo\'q bo\'lsa faol emas', () => {
    expect(
      isServiceDiscountActive({ discountType: NEVER, discountValue: 10 }),
    ).toBe(false);
  });

  it('qiymat 0 yoki manfiy bo\'lsa faol emas', () => {
    expect(
      isServiceDiscountActive({ discountType: 'percent', discountValue: 0 }),
    ).toBe(false);
    expect(
      isServiceDiscountActive({ discountType: 'percent', discountValue: -5 }),
    ).toBe(false);
  });

  it('noma\'lum tur qabul qilinmaydi', () => {
    expect(
      isServiceDiscountActive({ discountType: 'bonus', discountValue: 10 }),
    ).toBe(false);
  });

  it('muddati o\'tgan chegirma faol emas', () => {
    expect(
      isServiceDiscountActive({
        discountType: 'percent',
        discountValue: 10,
        discountValidUntil: YESTERDAY,
      }),
    ).toBe(false);
  });

  it('muddati kelmagan yoki cheksiz chegirma faol', () => {
    expect(
      isServiceDiscountActive({
        discountType: 'percent',
        discountValue: 10,
        discountValidUntil: TOMORROW,
      }),
    ).toBe(true);
    expect(
      isServiceDiscountActive({ discountType: 'fixed', discountValue: 5000 }),
    ).toBe(true);
  });
});

describe('applyServiceDiscount', () => {
  it('faol chegirma bo\'lmasa narx o\'zgarmaydi', () => {
    expect(
      applyServiceDiscount(30000, { discountType: NEVER, discountValue: NEVER }),
    ).toBe(30000);
  });

  it('foizli chegirmani yaxlitlab qo\'llaydi', () => {
    expect(
      applyServiceDiscount(30000, { discountType: 'percent', discountValue: 10 }),
    ).toBe(27000);
    expect(
      applyServiceDiscount(33333, { discountType: 'percent', discountValue: 15 }),
    ).toBe(28333);
  });

  it('belgilangan summani ayiradi', () => {
    expect(
      applyServiceDiscount(30000, { discountType: 'fixed', discountValue: 5000 }),
    ).toBe(25000);
  });

  it('narx hech qachon manfiy bo\'lmaydi', () => {
    expect(
      applyServiceDiscount(3000, { discountType: 'fixed', discountValue: 5000 }),
    ).toBe(0);
    expect(
      applyServiceDiscount(1000, { discountType: 'percent', discountValue: 100 }),
    ).toBe(0);
  });

  it('muddati o\'tgan chegirma narxni o\'zgartirmaydi', () => {
    expect(
      applyServiceDiscount(30000, {
        discountType: 'percent',
        discountValue: 50,
        discountValidUntil: YESTERDAY,
      }),
    ).toBe(30000);
  });
});

describe('discountLabel', () => {
  it('faol bo\'lmagan chegirma uchun null', () => {
    expect(discountLabel({ discountType: NEVER, discountValue: NEVER })).toBeNull();
  });

  it('turiga qarab yorliq beradi', () => {
    expect(discountLabel({ discountType: 'percent', discountValue: 10 })).toBe('-10%');
    expect(discountLabel({ discountType: 'fixed', discountValue: 5000 })).toBe(
      "-5000 so'm",
    );
  });
});
