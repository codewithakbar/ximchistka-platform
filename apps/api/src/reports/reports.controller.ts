import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';

@Controller('reports')
export class ReportsController {
  constructor(private reports: ReportsService) {}

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator, UserRole.courier)
  @Get('dashboard')
  dashboard(
    @CurrentUser() user: { role: UserRole; organizationId?: string; branchIds: string[] },
  ) {
    return this.reports.dashboard(user);
  }

  @Roles(UserRole.super_admin)
  @Get('daily')
  daily(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: { role: UserRole; organizationId?: string; branchIds: string[] },
  ) {
    return this.reports.dailyReport(from, to, user!, branchId);
  }

  @Roles(UserRole.super_admin)
  @Get('export')
  export(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('branchId') branchId?: string,
    @CurrentUser() user?: { role: UserRole; organizationId?: string; branchIds: string[] },
  ) {
    return this.reports.exportCsv(from, to, user!, branchId);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get('branch/:branchId/finance')
  branchFinance(
    @Param('branchId') branchId: string,
    @Query('from') from: string,
    @Query('to') to: string,
    @CurrentUser() user: { role: UserRole; organizationId?: string; branchIds: string[] },
  ) {
    return this.reports.branchFinance(branchId, from, to, user);
  }
}
