import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PromoCode } from '@prisma/client';
import { DISCOUNT_TYPES, DiscountType } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';
import { TenantUser } from '../branches/tenant-scope';

export type PromoPreview = {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  /** Berilgan summaga tushadigan chegirma */
  discountAmount: number;
  /** Chegirmadan keyingi summa */
  finalAmount: number;
};

@Injectable()
export class PromoService {
  private readonly logger = new Logger(PromoService.name);

  constructor(private prisma: PrismaService) {}

  private requireOrganizationId(user: TenantUser) {
    if (!user.organizationId) {
      throw new ForbiddenException('Tashkilot topilmadi');
    }
    return user.organizationId;
  }

  private normalizeCode(code: string) {
    const cleaned = code.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleaned) throw new BadRequestException('Promo-kod bo\'sh bo\'lmasligi kerak');
    if (cleaned.length > 32) {
      throw new BadRequestException('Promo-kod 32 belgidan oshmasligi kerak');
    }
    return cleaned;
  }

  private assertDiscount(type: string, value: number) {
    if (!DISCOUNT_TYPES.includes(type as DiscountType)) {
      throw new BadRequestException('Chegirma turi percent yoki fixed bo\'lishi kerak');
    }
    if (!Number.isFinite(value) || value <= 0) {
      throw new BadRequestException('Chegirma qiymati 0 dan katta bo\'lishi kerak');
    }
    if (type === 'percent' && value > 100) {
      throw new BadRequestException('Foiz chegirma 100 dan oshmasligi kerak');
    }
  }

  /** Firmaning o'z kodlari + platforma bo'ylab umumiy kodlar */
  async list(user: TenantUser) {
    const organizationId = this.requireOrganizationId(user);
    const rows = await this.prisma.promoCode.findMany({
      where: { OR: [{ organizationId }, { organizationId: null }] },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map((p) => this.map(p, organizationId));
  }

  async create(
    user: TenantUser,
    data: {
      code: string;
      discountType: string;
      discountValue: number;
      maxUses?: number | null;
      validUntil?: string | null;
    },
  ) {
    const organizationId = this.requireOrganizationId(user);
    const code = this.normalizeCode(data.code);
    this.assertDiscount(data.discountType, data.discountValue);

    const clash = await this.prisma.promoCode.findFirst({
      where: { code, OR: [{ organizationId }, { organizationId: null }] },
    });
    if (clash) throw new BadRequestException('Bu promo-kod allaqachon mavjud');

    const promo = await this.prisma.promoCode.create({
      data: {
        organizationId,
        code,
        discountType: data.discountType,
        discountValue: Math.floor(data.discountValue),
        maxUses: data.maxUses ? Math.floor(data.maxUses) : null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });
    return this.map(promo, organizationId);
  }

  async update(
    user: TenantUser,
    id: string,
    data: Partial<{
      discountType: string;
      discountValue: number;
      maxUses: number | null;
      validUntil: string | null;
      isActive: boolean;
    }>,
  ) {
    const organizationId = this.requireOrganizationId(user);
    const promo = await this.ensureOwned(id, organizationId);

    const discountType = data.discountType ?? promo.discountType;
    const discountValue = data.discountValue ?? promo.discountValue;
    if (data.discountType !== undefined || data.discountValue !== undefined) {
      this.assertDiscount(discountType, discountValue);
    }

    const updated = await this.prisma.promoCode.update({
      where: { id },
      data: {
        ...(data.discountType !== undefined ? { discountType } : {}),
        ...(data.discountValue !== undefined
          ? { discountValue: Math.floor(discountValue) }
          : {}),
        ...(data.maxUses !== undefined
          ? { maxUses: data.maxUses ? Math.floor(data.maxUses) : null }
          : {}),
        ...(data.validUntil !== undefined
          ? { validUntil: data.validUntil ? new Date(data.validUntil) : null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    });
    return this.map(updated, organizationId);
  }

  async remove(user: TenantUser, id: string) {
    const organizationId = this.requireOrganizationId(user);
    const promo = await this.ensureOwned(id, organizationId);

    if (promo.usedCount > 0) {
      throw new BadRequestException(
        'Bu kod ishlatilgan — o\'chirish mumkin emas. Faolsizlantiring.',
      );
    }

    await this.prisma.promoCode.delete({ where: { id } });
    return { deleted: true, id };
  }

  /**
   * Kodni tekshiradi va berilgan summaga tushadigan chegirmani hisoblaydi.
   * Hech narsa o'zgartirmaydi — POS da yakuniy summani oldindan ko'rsatish uchun.
   */
  async preview(
    code: string,
    organizationId: string,
    amount: number,
  ): Promise<PromoPreview> {
    const promo = await this.findUsable(code, organizationId);
    const discountAmount = this.discountFor(promo, amount);

    return {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType as DiscountType,
      discountValue: promo.discountValue,
      discountAmount,
      finalAmount: Math.max(0, amount - discountAmount),
    };
  }

  /** Buyurtma yaratilayotganda: kodni tekshiradi va chegirmani qaytaradi */
  async resolveForOrder(code: string, organizationId: string, amount: number) {
    const promo = await this.findUsable(code, organizationId);
    return {
      id: promo.id,
      code: promo.code,
      discountAmount: this.discountFor(promo, amount),
    };
  }

  /**
   * Buyurtma muvaffaqiyatli yaratilgach chaqiriladi. maxUses shartli tekshiriladi,
   * shuning uchun bir vaqtda kelgan so'rovlar limitdan oshirib yubormaydi.
   */
  async markUsed(promoId: string) {
    try {
      await this.prisma.promoCode.update({
        where: { id: promoId },
        data: { usedCount: { increment: 1 } },
      });
    } catch (err) {
      // Buyurtma allaqachon yaratilgan — hisoblagich xatosi uni bekor qilmasligi kerak
      this.logger.warn(`Promo-kod hisoblagichi yangilanmadi (${promoId})`, err);
    }
  }

  private discountFor(promo: PromoCode, amount: number) {
    if (amount <= 0) return 0;
    if (promo.discountType === 'percent') {
      return Math.min(amount, Math.round((amount * promo.discountValue) / 100));
    }
    return Math.min(amount, promo.discountValue);
  }

  private async findUsable(code: string, organizationId: string) {
    const normalized = this.normalizeCode(code);
    const promo = await this.prisma.promoCode.findFirst({
      where: {
        code: normalized,
        OR: [{ organizationId }, { organizationId: null }],
      },
    });
    if (!promo) throw new NotFoundException('Promo-kod topilmadi');
    if (!promo.isActive) throw new BadRequestException('Promo-kod faol emas');

    const now = new Date();
    if (promo.validFrom > now) {
      throw new BadRequestException('Promo-kod hali kuchga kirmagan');
    }
    if (promo.validUntil && promo.validUntil < now) {
      throw new BadRequestException('Promo-kod muddati tugagan');
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo-kod ishlatish chegarasi tugagan');
    }
    return promo;
  }

  private async ensureOwned(id: string, organizationId: string) {
    const promo = await this.prisma.promoCode.findFirst({
      where: { id, organizationId },
    });
    if (!promo) {
      throw new NotFoundException('Promo-kod topilmadi yoki tahrirlash mumkin emas');
    }
    return promo;
  }

  private map(promo: PromoCode, organizationId: string) {
    return {
      id: promo.id,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      maxUses: promo.maxUses,
      usedCount: promo.usedCount,
      validFrom: promo.validFrom.toISOString(),
      validUntil: promo.validUntil?.toISOString() ?? null,
      isActive: promo.isActive,
      /** Platforma kodlarini firma tahrirlay olmaydi */
      editable: promo.organizationId === organizationId,
      createdAt: promo.createdAt.toISOString(),
    };
  }
}
