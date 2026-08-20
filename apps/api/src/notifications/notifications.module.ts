import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EskizClient } from './eskiz.client';

@Module({
  providers: [NotificationsService, EskizClient],
  exports: [NotificationsService],
})
export class NotificationsModule {}
