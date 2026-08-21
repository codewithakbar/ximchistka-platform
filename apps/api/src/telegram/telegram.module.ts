import { Global, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

/**
 * Chiquvchi Telegram xabarlari (past daraja). Global — buyurtma/to'lov
 * bildirishnomalari ko'p modullardan yuboriladi.
 */
@Global()
@Module({
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
