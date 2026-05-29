import { BadRequestException, Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';

class CreateStaffDto {
  @IsString() organizationId!: string;
  @IsString() phone!: string;
  @IsOptional() @IsEmail() email?: string;
  @IsString() fullName!: string;
  @IsEnum(UserRole) role!: UserRole;
  @IsString() @MinLength(6) password!: string;
  @IsOptional() @IsArray() branchIds?: string[];
  @IsOptional() @IsString() avatarUrl?: string;
}

class UpdateStaffBranchesDto {
  @IsArray() @IsString({ each: true }) branchIds!: string[];
}

class UpdateStaffProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsString() avatarUrl?: string | null;
}

@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get('staff')
  listStaff(@CurrentUser() user: { organizationId?: string; role: UserRole }) {
    if (!user.organizationId) {
      throw new BadRequestException('Tashkilot topilmadi');
    }
    return this.users.listStaff(user.organizationId);
  }

  @Roles(UserRole.super_admin)
  @Post('staff')
  createStaff(
    @CurrentUser() user: { organizationId?: string; role: UserRole },
    @Body() dto: CreateStaffDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Tashkilot topilmadi');
    }

    return this.users.createStaff({
      ...dto,
      organizationId: user.organizationId,
      branchIds: dto.branchIds,
    });
  }

  @Roles(UserRole.super_admin)
  @Patch('staff/:id/branches')
  updateStaffBranches(
    @CurrentUser() user: { organizationId?: string },
    @Param('id') id: string,
    @Body() dto: UpdateStaffBranchesDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Tashkilot topilmadi');
    }
    return this.users.updateStaffBranches(user.organizationId, id, dto.branchIds);
  }

  @Roles(UserRole.super_admin)
  @Patch('staff/:id')
  updateStaffProfile(
    @CurrentUser() user: { organizationId?: string },
    @Param('id') id: string,
    @Body() dto: UpdateStaffProfileDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Tashkilot topilmadi');
    }
    return this.users.updateStaffProfile(user.organizationId, id, dto);
  }
}
