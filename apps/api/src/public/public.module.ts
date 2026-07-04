import { Module } from '@nestjs/common';
import { PlatformModule } from '../platform/platform.module';
import { PublicController } from './public.controller';

@Module({
  imports: [PlatformModule],
  controllers: [PublicController],
})
export class PublicModule {}
