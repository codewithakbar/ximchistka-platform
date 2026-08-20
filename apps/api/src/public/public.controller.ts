import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Public } from '../auth/guards';
import { PlatformService } from '../platform/platform.service';

class TrialSignupDto {
  @IsString() name!: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsString() branchName!: string;
  @IsString() branchAddress!: string;
  @IsString() branchPhone!: string;
  @IsString() adminFullName!: string;
  @IsString() adminPhone!: string;
  @IsString() @MinLength(6) adminPassword!: string;
  @IsOptional() @IsInt() demoDays?: number;
}

@Controller('public')
export class PublicController {
  constructor(private platform: PlatformService) {}

  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Public()
  @Post('trial-signup')
  trialSignup(@Body() dto: TrialSignupDto) {
    return this.platform.publicTrialSignup(dto);
  }
}
