import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersGateway } from './orders.gateway';
import { AdminNotifyService } from './admin-notify.service';
import { BranchesModule } from '../branches/branches.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [BranchesModule, NotificationsModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersGateway, AdminNotifyService],
  exports: [OrdersService, OrdersGateway, AdminNotifyService],
})
export class OrdersModule {}
