import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';
import { TenantUser } from '../branches/tenant-scope';

class AddAddressDto {
  @IsOptional() @IsString() label?: string;
  @IsString() address!: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

@Controller('customers')
export class CustomersController {
  constructor(private customers: CustomersService) {}

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator)
  @Get()
  search(
    @Query('q') q?: string,
    @CurrentUser() user?: TenantUser,
  ) {
    return this.customers.search(q, user!);
  }

  @Roles(UserRole.customer)
  @Get('me')
  me(@CurrentUser() user: { id: string }) {
    return this.customers.getProfile(user.id);
  }

  @Roles(UserRole.customer)
  @Post('addresses')
  addAddress(
    @CurrentUser() user: { id: string; customerProfileId?: string },
    @Body() dto: AddAddressDto,
  ) {
    return this.customers.addAddress(user.customerProfileId!, dto);
  }
}
