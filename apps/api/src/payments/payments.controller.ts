import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentProvider, UserRole } from '@prisma/client';
import { PaymentsService, type PaymentActor } from './payments.service';
import { CurrentUser } from '../auth/decorators';
import { Public, Roles } from '../auth/guards';

class InitiatePaymentDto {
  @IsEnum(PaymentProvider) provider!: PaymentProvider;
}

class RecordPaymentDto {
  @IsEnum(PaymentProvider) provider!: PaymentProvider;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsOptional() @IsString() note?: string;
}

const STAFF_ROLES = [
  UserRole.super_admin,
  UserRole.branch_manager,
  UserRole.operator,
] as const;

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Roles(UserRole.customer, ...STAFF_ROLES)
  @Get('orders/:orderId')
  summary(@Param('orderId') orderId: string, @CurrentUser() user: PaymentActor) {
    return this.payments.summaryForOrder(orderId, user);
  }

  @Roles(...STAFF_ROLES)
  @Post('orders/:orderId/record')
  record(
    @Param('orderId') orderId: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: PaymentActor,
  ) {
    return this.payments.record(orderId, dto, user);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Post(':id/refund')
  refund(@Param('id') id: string, @CurrentUser() user: PaymentActor) {
    return this.payments.refund(id, user);
  }

  @Roles(UserRole.customer, ...STAFF_ROLES)
  @Post('orders/:orderId/initiate')
  initiate(
    @Param('orderId') orderId: string,
    @Body() dto: InitiatePaymentDto,
    @CurrentUser() user: PaymentActor,
  ) {
    return this.payments.initiate(orderId, dto.provider, user);
  }

  @Public()
  @Post('webhook/:provider')
  webhook(
    @Param('provider') provider: string,
    @Body() payload: Record<string, unknown>,
    @Headers() headers: Record<string, string>,
  ) {
    return this.payments.webhook(provider, payload, headers);
  }
}
