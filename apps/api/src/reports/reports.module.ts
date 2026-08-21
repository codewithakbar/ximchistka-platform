import { Module } from '@nestjs/common';
import { BranchesModule } from '../branches/branches.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [BranchesModule, ExpensesModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
