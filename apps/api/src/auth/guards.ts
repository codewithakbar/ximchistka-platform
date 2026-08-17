import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { UserRole } from '@prisma/client';
import { firstValueFrom, isObservable } from 'rxjs';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      await this.tryAttachUser(context);
      return true;
    }

    const result = super.canActivate(context);
    if (isObservable(result)) return firstValueFrom(result) as Promise<boolean>;
    return result as boolean | Promise<boolean>;
  }

  /** Public route: token bo'lsa user ni request ga biriktiradi */
  private async tryAttachUser(context: ExecutionContext) {
    try {
      const result = super.canActivate(context);
      if (isObservable(result)) {
        await firstValueFrom(result);
      } else if (result instanceof Promise) {
        await result;
      } else if (!result) {
        throw new Error('Unauthorized');
      }
    } catch {
      /* token yo'q yoki yaroqsiz — anonim davom etadi */
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles?.length) return true;
    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.includes(user.role);
  }
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Demo muddati tugagan tashkilot kirishi mumkin, lekin o'zgartirish mumkin emas */
@Injectable()
export class DemoUsageGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<{
      method?: string;
      user?: { demoExpired?: boolean };
    }>();
    if (READ_METHODS.has((req.method ?? 'GET').toUpperCase())) return true;
    if (!req.user?.demoExpired) return true;

    throw new ForbiddenException(
      'Demo muddati tugagan. Platforma admin bilan bog\'laning.',
    );
  }
}
