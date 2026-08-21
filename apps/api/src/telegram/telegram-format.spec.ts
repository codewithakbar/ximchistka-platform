import { describe, expect, it } from 'vitest';
import {
  customerOrderLine,
  customerStatusNotification,
  escapeHtml,
  looksLikeOrderNumber,
  orderDetailHtml,
} from './telegram-format';

describe('escapeHtml', () => {
  it('HTML belgilarini xavfsizlaydi', () => {
    expect(escapeHtml('<b>&"</b>')).toBe('&lt;b&gt;&amp;"&lt;/b&gt;');
  });
});

describe('looksLikeOrderNumber', () => {
  it('chek raqamlarini taniydi', () => {
    expect(looksLikeOrderNumber('CH1-0100')).toBe(true);
    expect(looksLikeOrderNumber('xc-0005')).toBe(true);
    expect(looksLikeOrderNumber(' XC-1 ')).toBe(true);
  });

  it('oddiy matnni rad etadi', () => {
    expect(looksLikeOrderNumber('salom')).toBe(false);
    expect(looksLikeOrderNumber('📦 Buyurtmalarim')).toBe(false);
    expect(looksLikeOrderNumber('CH1-')).toBe(false);
    expect(looksLikeOrderNumber('-0100')).toBe(false);
  });
});

describe('customerOrderLine', () => {
  const base = {
    orderNumber: 'CH1-0100',
    status: 'ready' as const,
    totalAmount: 85000,
    createdAt: new Date(),
    branchName: 'Chilonzor',
  };

  it("to'lanmagan buyurtma belgilanadi", () => {
    const line = customerOrderLine({ ...base, paidAmount: 0 });
    expect(line).toContain("to'lanmagan");
    expect(line).toContain('CH1-0100');
  });

  it("qisman to'lov summa bilan ko'rsatiladi", () => {
    const line = customerOrderLine({ ...base, paidAmount: 50000 });
    expect(line).toContain('qisman');
  });

  it("to'liq to'langan buyurtma", () => {
    const line = customerOrderLine({ ...base, paidAmount: 85000 });
    expect(line).toContain("to'langan");
    expect(line).not.toContain('qisman');
  });
});

describe('orderDetailHtml', () => {
  const detail = {
    orderNumber: 'CH1-0100',
    status: 'in_processing' as const,
    totalAmount: 85000,
    paidAmount: 20000,
    createdAt: new Date('2026-08-22T10:00:00'),
    estimatedReady: new Date('2026-08-24T10:00:00'),
    branchName: 'Chilonzor <filial>',
    customerName: 'Sardor & Co',
    customerPhone: '+998901234567',
    items: [{ name: "Ko'ylak", quantity: 2, unitPrice: 25000 }],
    history: [{ status: 'submitted' as const, createdAt: new Date('2026-08-22T10:00:00') }],
  };

  it('xodim rejimida mijoz ismi chiqadi, HTML xavfsizlangan', () => {
    const html = orderDetailHtml(detail, { forStaff: true });
    expect(html).toContain('Sardor &amp; Co');
    expect(html).toContain('Chilonzor &lt;filial&gt;');
    expect(html).toContain("To'lanmagan qoldiq");
  });

  it('mijoz rejimida ism chiqmaydi', () => {
    const html = orderDetailHtml(detail, { forStaff: false });
    expect(html).not.toContain('Sardor');
  });
});

describe('customerStatusNotification', () => {
  it('tayyor holatda olib ketish taklifi qo\'shiladi', () => {
    const html = customerStatusNotification({
      orderNumber: 'CH1-0100',
      status: 'ready',
      branchName: 'Chilonzor',
    });
    expect(html).toContain('olib ketishingiz');
  });
});
