import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { ExpensesService } from './expenses.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';
import { TenantUser } from '../branches/tenant-scope';

class CreateExpenseDto {
  @IsOptional() @IsString() branchId?: string | null;
  @IsString() category!: string;
  @Type(() => Number) @IsInt() @Min(1) amount!: number;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsString() spentAt?: string;
}

@Controller('expenses')
export class ExpensesController {
  constructor(private expenses: ExpensesService) {}

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Get()
  list(
    @CurrentUser() user: TenantUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('branchId') branchId?: string,
  ) {
    return this.expenses.list(user, { from, to, branchId });
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Post()
  create(
    @CurrentUser() user: TenantUser & { id: string },
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expenses.create(user, dto);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager)
  @Delete(':id')
  remove(@CurrentUser() user: TenantUser, @Param('id') id: string) {
    return this.expenses.remove(user, id);
  }
}
