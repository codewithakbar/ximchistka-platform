import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import { Public } from './guards';

class StaffLoginDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RequestOtpDto {
  @IsString()
  phone!: string;
}

class VerifyOtpDto {
  @IsString()
  phone!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  fullName?: string;
}

class RefreshDto {
  @IsString()
  refreshToken!: string;
}

class TelegramRequestDto {
  @IsString()
  phone!: string;
}

class TelegramVerifyDto {
  @IsString()
  phone!: string;

  @IsString()
  @MinLength(4)
  code!: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @Public()
  @Post('staff/login')
  staffLogin(@Body() dto: StaffLoginDto) {
    return this.auth.staffLogin(dto.phone, dto.password);
  }

  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Public()
  @Post('otp/request')
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.fullName);
  }

  @Public()
  @Get('telegram/bot')
  telegramBot() {
    return this.auth.telegramBotInfo();
  }

  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @Public()
  @Post('telegram/request')
  telegramRequest(@Body() dto: TelegramRequestDto) {
    return this.auth.requestTelegramLogin(dto.phone);
  }

  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @Public()
  @Post('telegram/verify')
  telegramVerify(@Body() dto: TelegramVerifyDto) {
    return this.auth.verifyTelegramLogin(dto.phone, dto.code);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken);
  }
}
