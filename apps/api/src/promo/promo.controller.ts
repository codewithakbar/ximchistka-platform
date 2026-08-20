import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { PromoService } from './promo.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';
import { TenantUser } from '../branches/tenant-scope';

class CreatePromoDto {
  @IsString() code!: string;
  @IsString() discountType!: string;
  @Type(() => Number) @IsInt() @Min(1) discountValue!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number | null;
  @IsOptional() @IsString() validUntil?: string | null;
}

class UpdatePromoDto {
  @IsOptional() @IsString() discountType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) discountValue?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) maxUses?: number | null;
  @IsOptional() @IsString() validUntil?: string | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('promo-codes')
export class PromoController {
  constructor(private promo: PromoService) {}

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get()
  list(@CurrentUser() user: TenantUser) {
    return this.promo.list(user);
  }

  /** POS: yakuniy summani oldindan ko'rsatish uchun */
  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator)
  @Get('preview')
  preview(
    @Query('code') code: string,
    @Query('amount') amount: string,
    @CurrentUser() user: TenantUser,
  ) {
    if (!user.organizationId) throw new BadRequestException('Tashkilot topilmadi');
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new BadRequestException('Summa noto\'g\'ri');
    }
    return this.promo.preview(code ?? '', user.organizationId, Math.floor(parsed));
  }

  @Roles(UserRole.super_admin)
  @Post()
  create(@CurrentUser() user: TenantUser, @Body() dto: CreatePromoDto) {
    return this.promo.create(user, dto);
  }

  @Roles(UserRole.super_admin)
  @Patch(':id')
  update(
    @CurrentUser() user: TenantUser,
    @Param('id') id: string,
    @Body() dto: UpdatePromoDto,
  ) {
    return this.promo.update(user, id, dto);
  }

  @Roles(UserRole.super_admin)
  @Delete(':id')
  remove(@CurrentUser() user: TenantUser, @Param('id') id: string) {
    return this.promo.remove(user, id);
  }
}
