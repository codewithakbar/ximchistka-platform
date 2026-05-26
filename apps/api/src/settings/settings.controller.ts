import { Body, Controller, Get, Patch } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { UserRole } from '@prisma/client';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';

class UpdateProfileDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
}

class ChangePasswordDto {
  @IsString() currentPassword!: string;
  @IsString() @MinLength(6) newPassword!: string;
}

class UpdateOrganizationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
}

@Controller('settings')
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.settings.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    return this.settings.updateProfile(user.id, dto);
  }

  @Patch('password')
  changePassword(
    @CurrentUser() user: { id: string },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.settings.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get('organization')
  getOrganization(@CurrentUser() user: { organizationId?: string }) {
    return this.settings.getOrganization(user.organizationId);
  }

  @Roles(UserRole.super_admin)
  @Patch('organization')
  updateOrganization(
    @CurrentUser() user: { organizationId?: string },
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.settings.updateOrganization(user.organizationId, dto);
  }

  @Get('system')
  getSystem(@CurrentUser() user: { role: UserRole }) {
    if (user.role === UserRole.customer) {
      return { smsProvider: 'hidden' };
    }
    return this.settings.getSystemInfo();
  }
}
