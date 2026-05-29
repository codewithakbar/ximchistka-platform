import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { ServicesCatalogService } from './services.service';
import { Public, Roles } from '../auth/guards';
import { CurrentUser } from '../auth/decorators';

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

  @Public()
  @Get('categories')
  listCategories() {
    return this.services.listCategories();
  }

  @Public()
  @Get()
  listServices() {
    return this.services.listServices();
  }

  @Public()
  @Get('prices/:branchId')
  branchPrices(@Param('branchId') branchId: string) {
    return this.services.getBranchPrices(branchId);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get('manage/categories')
  listCategoriesForManage() {
    return this.services.listCategoriesForManage();
  }

  @Roles(UserRole.super_admin)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.services.createCategory(dto);
  }

  @Roles(UserRole.super_admin)
  @Post()
  createService(@Body() dto: CreateServiceDto) {
    return this.services.createService(dto);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Post('prices')
  upsertPrice(
    @CurrentUser() user: { role: UserRole; organizationId?: string; branchIds: string[] },
    @Body() dto: PriceRuleDto,
  ) {
    return this.services.upsertPriceRule(user, dto);
  }

  @Roles(UserRole.super_admin)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.services.updateCategory(id, dto);
  }

  @Roles(UserRole.super_admin)
  @Patch(':id')
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.services.updateService(id, dto);
  }
}
