import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { OrganizationPlan, UserRole } from '@prisma/client';
import { PlatformService } from './platform.service';
import { Roles } from '../auth/guards';

class CreateOrganizationDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsInt() demoDays?: number;
  @IsString() branchName!: string;
  @IsString() branchAddress!: string;
  @IsString() branchPhone!: string;
  @IsString() adminFullName!: string;
  @IsString() adminPhone!: string;
  @IsString() @MinLength(6) adminPassword!: string;
}

class UpdateOrganizationDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsEnum(OrganizationPlan) plan?: OrganizationPlan;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

class ExtendDemoDto {
  @IsOptional() @IsInt() days?: number;
}

@Controller('platform')
@Roles(UserRole.platform_admin)
export class PlatformController {
  constructor(private platform: PlatformService) {}

  @Get('dashboard')
  dashboard() {
    return this.platform.dashboardStats();
  }

  @Get('organizations')
  listOrganizations() {
    return this.platform.listOrganizations();
  }

  @Get('organizations/:id')
  getOrganization(@Param('id') id: string) {
    return this.platform.getOrganization(id);
  }

  @Post('organizations')
  createOrganization(@Body() dto: CreateOrganizationDto) {
    return this.platform.createOrganization(dto);
  }

  @Patch('organizations/:id')
  updateOrganization(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) {
    return this.platform.updateOrganization(id, dto);
  }

  @Post('organizations/:id/extend-demo')
  extendDemo(@Param('id') id: string, @Body() dto: ExtendDemoDto) {
    return this.platform.extendDemo(id, dto.days ?? 14);
  }

  @Post('organizations/:id/activate')
  activate(@Param('id') id: string) {
    return this.platform.activatePlan(id);
  }

  @Post('organizations/:id/suspend')
  suspend(@Param('id') id: string) {
    return this.platform.updateOrganization(id, {
      plan: OrganizationPlan.suspended,
      isActive: false,
    });
  }
}
