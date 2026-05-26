import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { IsString } from 'class-validator';
import { UserRole } from '@prisma/client';
import { CourierService } from './courier.service';
import { CurrentUser } from '../auth/decorators';
import { Roles } from '../auth/guards';
import { TenantUser } from '../branches/tenant-scope';

class AssignDto {
  @IsString() courierId!: string;
}

@Controller('courier')
export class CourierController {
  constructor(private courier: CourierService) {}

  @Roles(UserRole.courier)
  @Get('tasks')
  myTasks(@CurrentUser() user: { id: string }) {
    return this.courier.listTasks(user.id);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator)
  @Get('unassigned')
  unassigned(@CurrentUser() user: TenantUser) {
    return this.courier.listUnassigned(user);
  }

  @Roles(UserRole.super_admin, UserRole.branch_manager, UserRole.operator)
  @Patch('deliveries/:id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignDto) {
    return this.courier.assign(id, dto.courierId);
  }

  @Roles(UserRole.courier)
  @Patch('deliveries/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.courier.complete(id, user.id);
  }
}
