import { Body, Controller, Headers, Param, Post } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { PaymentProvider, UserRole } from '@prisma/client';
import { PaymentsService, type PaymentActor } from './payments.service';
import { CurrentUser } from '../auth/decorators';
import { Public, Roles } from '../auth/guards';

class InitiatePaymentDto {
  @IsEnum(PaymentProvider) provider!: PaymentProvider;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Roles(
    UserRole.customer,
    UserRole.operator,
    UserRole.branch_manager,
    UserRole.super_admin,
  )
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
