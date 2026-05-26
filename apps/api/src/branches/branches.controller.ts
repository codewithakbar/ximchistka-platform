import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { BranchesService } from './branches.service';
import { CurrentUser } from '../auth/decorators';
import { Public, Roles } from '../auth/guards';
import { TenantUser } from './tenant-scope';

class CreateBranchDto {
  @IsString() name!: string;
  @IsString() address!: string;
  @IsString() phone!: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() openTime?: string;
  @IsOptional() @IsString() closeTime?: string;
}

class UpdateBranchDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
  @IsOptional() @IsString() openTime?: string;
  @IsOptional() @IsString() closeTime?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('branches')
export class BranchesController {
  constructor(private branches: BranchesService) {}

  /** Mijoz veb: organizationSlug bilan. CRM: JWT orqali o'z tashkiloti */
  @Public()
  @Get()
  findAll(
    @Query('organizationSlug') organizationSlug?: string,
    @CurrentUser() user?: TenantUser,
  ) {
    return this.branches.findAll(user, organizationSlug);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: TenantUser) {
    return this.branches.findOne(id, user);
  }

  @Roles(UserRole.super_admin)
  @Post()
  create(
    @CurrentUser() user: TenantUser & { organizationId?: string },
    @Body() dto: CreateBranchDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Tashkilot topilmadi');
    }
    return this.branches.create({ ...dto, organizationId: user.organizationId });
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
    @CurrentUser() user: TenantUser,
  ) {
    return this.branches.updateForUser(user, id, dto);
  }

  @Roles(UserRole.super_admin)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: TenantUser) {
    return this.branches.remove(user, id);
  }
}
