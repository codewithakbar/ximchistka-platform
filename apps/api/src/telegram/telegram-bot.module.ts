import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { ReportsModule } from '../reports/reports.module';
import { TelegramBotService } from './telegram-bot.service';

/** Kiruvchi bot suhbati (long polling) */
@Module({
  imports: [OrdersModule, ReportsModule],
  providers: [TelegramBotService],
  exports: [TelegramBotService],
})
export class TelegramBotModule {}
