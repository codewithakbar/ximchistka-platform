import { Module } from '@nestjs/common';
import { ServicesCatalogService } from './services.service';
import { ServicesController } from './services.controller';

@Module({
  controllers: [ServicesController],
  providers: [ServicesCatalogService],
  exports: [ServicesCatalogService],
})
export class ServicesModule {}
