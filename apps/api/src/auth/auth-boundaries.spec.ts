import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserRole } from '@prisma/client';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

/**
 * Kirish chegaralari uchun regressiya testlari.
 *
 * Uchala holat ham audit paytida ochiq edi va real zarar keltirardi:
 * mijoz OTP oqimi xodim tokenini berardi, ishlab chiqarishda mock SMS kodi
 * javobda qaytardi, va firma egasi o'ziga platforma admini yarata olardi.
 */

type AnyFn = (...args: unknown[]) => unknown;

function makeAuth(overrides: {
  otp?: { code: string; createdAt?: Date } | null;
  user?: { id: string; role: UserRole; fullName: string } | null;
}) {
  const issued: unknown[] = [];
  const prisma = {
    otpCode: {
      findFirst: vi.fn(async () => overrides.otp ?? null),
      update: vi.fn(async () => ({})),
      create: vi.fn(async () => ({})),
    },
    user: {
      findUnique: vi.fn(async () => overrides.user ?? null),
      create: vi.fn(async () => overrides.user ?? null),
      update: vi.fn(async () => overrides.user ?? null),
    },
    refreshToken: { create: vi.fn(async () => ({})) },
  };
  const jwt = {
    signAsync: vi.fn(async () => {
      issued.push('token');
      return 'signed.jwt.token';
    }),
  };
  const config = { get: vi.fn(() => undefined) };
  const notifications = { sendSms: vi.fn(async () => true) };
  const telegram = { isConfigured: vi.fn(() => false) };

  const service = new AuthService(
    prisma as never,
    jwt as never,
    config as never,
    notifications as never,
    telegram as never,
  );
  return { service, prisma, notifications, issued };
}

describe('verifyOtp — SMS kodi faqat mijozni kiritadi', () => {
  const validOtp = { code: '123456', createdAt: new Date() };

  it('xodim raqamiga token bermaydi', async () => {
    const { service, issued } = makeAuth({
      otp: validOtp,
      user: { id: 'u1', role: UserRole.super_admin, fullName: 'Ega' },
    });
    await expect(service.verifyOtp('+998901111111', '123456')).rejects.toThrow(
      /xodim hisobiga tegishli/i,
    );
    expect(issued).toHaveLength(0);
  });

  it('platforma adminga ham token bermaydi', async () => {
    const { service, issued } = makeAuth({
      otp: validOtp,
      user: { id: 'u2', role: UserRole.platform_admin, fullName: 'Platforma' },
    });
    await expect(service.verifyOtp('+998900000001', '123456')).rejects.toThrow();
    expect(issued).toHaveLength(0);
  });

  it('kuryerga ham token bermaydi', async () => {
    const { service } = makeAuth({
      otp: validOtp,
      user: { id: 'u3', role: UserRole.courier, fullName: 'Kuryer' },
    });
    await expect(service.verifyOtp('+998903333333', '123456')).rejects.toThrow();
  });

  it('mijoz esa odatdagidek kiradi', async () => {
    const { service, issued } = makeAuth({
      otp: validOtp,
      user: { id: 'c1', role: UserRole.customer, fullName: 'Mijoz' },
    });
    await service.verifyOtp('+998904444444', '123456');
    expect(issued.length).toBeGreaterThan(0);
  });
});

describe('requestOtp — mock SMS ishlab chiqarishga chiqmaydi', () => {
  const env = { ...process.env };
  beforeEach(() => {
    process.env.SMS_PROVIDER = 'mock';
  });
  afterEach(() => {
    process.env = { ...env };
  });

  it('ishlab chiqarishda mock bilan OTP to\'xtaydi va kod qaytmaydi', async () => {
    process.env.NODE_ENV = 'production';
    const { service, prisma } = makeAuth({ otp: null });
    await expect(service.requestOtp('+998901111111')).rejects.toThrow(
      /SMS xizmati sozlanmagan/i,
    );
    // Kod umuman yaratilmasligi kerak
    expect(prisma.otpCode.create).not.toHaveBeenCalled();
  });

  it('ishlab chiqishda mock kodi qulaylik uchun qaytadi', async () => {
    process.env.NODE_ENV = 'development';
    const { service } = makeAuth({ otp: null });
    const res = (await service.requestOtp('+998904444444')) as {
      devCode?: string;
    };
    expect(res.devCode).toBe('123456');
  });

  it('ishlab chiqarishda haqiqiy provayder bilan kod javobda qaytmaydi', async () => {
    process.env.NODE_ENV = 'production';
    process.env.SMS_PROVIDER = 'eskiz';
    const { service } = makeAuth({ otp: null });
    const res = (await service.requestOtp('+998904444444')) as {
      devCode?: string;
    };
    expect(res.devCode).toBeUndefined();
  });
});

describe('createStaff — firma egasi rol ko\'tara olmaydi', () => {
  function makeUsers() {
    const prisma = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'new' })),
      },
    };
    return {
      service: new UsersService(prisma as never),
      prisma,
    };
  }

  const base = {
    organizationId: 'org1',
    phone: '+998905555555',
    fullName: 'Yangi xodim',
    password: 'parol123',
  };

  it.each([UserRole.platform_admin, UserRole.super_admin, UserRole.customer])(
    '%s rolini yaratishga yo\'l qo\'ymaydi',
    async (role) => {
      const { service, prisma } = makeUsers();
      await expect(
        service.createStaff({ ...base, role } as never),
      ).rejects.toThrow(/yaratib bo'lmaydi/i);
      expect(prisma.user.create).not.toHaveBeenCalled();
    },
  );

  it.each([UserRole.branch_manager, UserRole.operator, UserRole.courier])(
    '%s rolini yaratishga ruxsat beradi',
    async (role) => {
      const { service, prisma } = makeUsers();
      await service.createStaff({ ...base, role } as never);
      expect(prisma.user.create).toHaveBeenCalled();
    },
  );
});

// Foydalanilmagan tipni linter uchun band qilamiz
export type { AnyFn };
