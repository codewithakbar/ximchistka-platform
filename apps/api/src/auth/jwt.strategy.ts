import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { OrganizationPlan, UserRole } from '@prisma/client';
import { JwtPayload } from '@ximchistka/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { userBranches: true, customerProfile: true, organization: true },
    });
    if (!user || !user.isActive) return null;

    if (user.role !== UserRole.platform_admin && user.role !== UserRole.customer) {
      if (!user.organization) {
        throw new UnauthorizedException('Tashkilot topilmadi');
      }
      const org = user.organization;
      if (!org.isActive || org.plan === OrganizationPlan.suspended) {
        throw new UnauthorizedException('Tashkilot faol emas');
      }
      if (
        (org.plan === OrganizationPlan.demo || org.plan === OrganizationPlan.expired) &&
        org.demoEndsAt &&
        org.demoEndsAt < new Date()
      ) {
        if (org.plan === OrganizationPlan.demo) {
          await this.prisma.organization.update({
            where: { id: org.id },
            data: { plan: OrganizationPlan.expired },
          });
        }
        throw new UnauthorizedException('Demo muddati tugagan');
      }
    }

    return {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
      branchIds: user.userBranches.map((b) => b.branchId),
      customerProfileId: user.customerProfile?.id,
      fullName: user.fullName,
      phone: user.phone,
    };
  }
}
