import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DeliveryType, OrderStatus, UserRole } from '@prisma/client';
import { OrdersService } from './orders.service';
import { CurrentUser } from '../auth/decorators';
import { Public, Roles } from '../auth/guards';

class OrderItemDto {
  @IsString() serviceId!: string;
  @IsOptional() @IsString() itemType?: string;
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsString() photoUrl?: string;
}

class CreateOrderDto {
  @IsString() branchId!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderItemDto) items!: OrderItemDto[];
  @IsOptional() @IsString() notes?: string;
  @IsEnum(DeliveryType) deliveryType!: DeliveryType;
  @IsOptional() @IsString() scheduledAt?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() promoCode?: string;
}

class StaffCreateOrderDto extends CreateOrderDto {
  @IsString() customerPhone!: string;
  @IsString() customerName!: string;
}

class UpdateStatusDto {
  @IsEnum(OrderStatus) status!: OrderStatus;
  @IsOptional() @IsString() note?: string;
}

@Controller('orders')
export class OrdersController {
  constructor(private orders: OrdersService) {}

  @Get()
  list(
    @CurrentUser() user: { id: string; role: UserRole; branchIds: string[]; customerProfileId?: string },
    @Query('branchId') branchId?: string,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.orders.list(user, {
      branchId,
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Public()
  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string) {
    return this.orders.trackByNumber(orderNumber);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: { role: UserRole; branchIds: string[]; customerProfileId?: string },
  ) {
    return this.orders.findOne(id, user);
  }

  @Roles(UserRole.customer)
  @Post()
  create(
    @CurrentUser() user: { id: string; role: UserRole; customerProfileId?: string },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orders.create(user, dto);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator)
  @Post('staff')
  createStaff(
    @CurrentUser() user: { id: string; role: UserRole; branchIds: string[] },
    @Body() dto: StaffCreateOrderDto,
  ) {
    return this.orders.createStaffOrder(user, dto);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator, UserRole.courier)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: { id: string; role: UserRole; branchIds: string[] },
  ) {
    return this.orders.updateStatus(id, dto.status, user, dto.note);
  }
}
