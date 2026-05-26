import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { BranchesModule } from './branches/branches.module';
import { ServicesModule } from './services/services.module';
import { OrdersModule } from './orders/orders.module';
import { CustomersModule } from './customers/customers.module';
import { UsersModule } from './users/users.module';
import { CourierModule } from './courier/courier.module';
import { ReportsModule } from './reports/reports.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { PlatformModule } from './platform/platform.module';
import { OrdersGateway } from './orders/orders.gateway';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    PrismaModule,
    AuthModule,
    BranchesModule,
    ServicesModule,
    OrdersModule,
    CustomersModule,
    UsersModule,
    CourierModule,
    ReportsModule,
    PaymentsModule,
    NotificationsModule,
    SettingsModule,
    PlatformModule,
  ],
  providers: [OrdersGateway],
})
export class AppModule {}
