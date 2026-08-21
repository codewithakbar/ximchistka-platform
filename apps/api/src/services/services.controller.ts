import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ServicesCatalogService } from './services.service';
import { Public, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';
import { TenantUser } from '../branches/tenant-scope';

class CreateCategoryDto {
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

class CreateServiceDto {
  @IsString() categoryId!: string;
  @IsString() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() basePrice!: number;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsBoolean() isCustom?: boolean;
  @IsOptional() @IsString() discountType?: string;
  @IsOptional() @IsNumber() discountValue?: number;
  @IsOptional() @IsString() discountValidUntil?: string;
}

class PriceRuleDto {
  @IsString() branchId!: string;
  @IsString() serviceId!: string;
  @IsOptional() @IsString() itemType?: string;
  @IsNumber() price!: number;
}

class UpdateServiceDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsNumber() basePrice?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isCustom?: boolean;
  @IsOptional() @IsString() discountType?: string | null;
  @IsOptional() @IsNumber() discountValue?: number | null;
  @IsOptional() @IsString() discountValidUntil?: string | null;
}

class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('services')
export class ServicesController {
  constructor(private services: ServicesCatalogService) {}

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator)
  @Get('categories')
  listCategories(@CurrentUser() user: TenantUser) {
    return this.services.listCategories(user);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get('manage/categories')
  listCategoriesForManage(@CurrentUser() user: TenantUser) {
    return this.services.listCategoriesForManage(user);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get()
  listServices(@CurrentUser() user: TenantUser) {
    return this.services.listServices(user);
  }

  @Public()
  @Get('prices/:branchId')
  branchPrices(
    @Param('branchId') branchId: string,
    @CurrentUser() user?: TenantUser,
  ) {
    // Konstruktor xizmatlar (narx buyurtmada kiritiladi) faqat xodim POS ida
    // ko'rinadi — mijoz ularni "0 so'm" deb buyurtma qila olmasin
    const includeCustom = Boolean(user && user.role !== UserRole.customer);
    return this.services.getBranchPrices(branchId, { includeCustom });
  }

  @Roles(UserRole.super_admin)
  @Post('categories')
  createCategory(@CurrentUser() user: TenantUser, @Body() dto: CreateCategoryDto) {
    return this.services.createCategory(user, dto);
  }

  @Roles(UserRole.super_admin)
  @Post()
  createService(@CurrentUser() user: TenantUser, @Body() dto: CreateServiceDto) {
    return this.services.createService(user, dto);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Post('prices')
  upsertPrice(@CurrentUser() user: TenantUser, @Body() dto: PriceRuleDto) {
    return this.services.upsertPriceRule(user, dto);
  }

  @Roles(UserRole.super_admin)
  @Patch('categories/:id')
  updateCategory(
    @CurrentUser() user: TenantUser,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.services.updateCategory(user, id, dto);
  }

  @Roles(UserRole.super_admin)
  @Delete('categories/:id')
  deleteCategory(@CurrentUser() user: TenantUser, @Param('id') id: string) {
    return this.services.deleteCategory(user, id);
  }

  @Roles(UserRole.super_admin)
  @Patch(':id')
  updateService(
    @CurrentUser() user: TenantUser,
    @Param('id') id: string,
    @Body() dto: UpdateServiceDto,
  ) {
    return this.services.updateService(user, id, dto);
  }

  @Roles(UserRole.super_admin)
  @Delete(':id')
  deleteService(@CurrentUser() user: TenantUser, @Param('id') id: string) {
    return this.services.deleteService(user, id);
  }
}
