import { Body, Controller, Param, Post } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { PaymentProvider, UserRole } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { Public, Roles } from '../auth/guards';

class InitiatePaymentDto {
  @IsEnum(PaymentProvider) provider!: PaymentProvider;
}

@Controller('payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Roles(UserRole.customer, UserRole.operator, UserRole.super_admin)
  @Post('orders/:orderId/initiate')
  initiate(@Param('orderId') orderId: string, @Body() dto: InitiatePaymentDto) {
    return this.payments.initiate(orderId, dto.provider);
  }

  @Public()
  @Post('webhook/:provider')
  webhook(@Param('provider') provider: string, @Body() payload: Record<string, unknown>) {
    return this.payments.webhook(provider, payload);
  }
}
