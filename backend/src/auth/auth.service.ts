import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SystemRole } from '@prisma/client';

export interface AppJwtPayload {
  sub: string;
  email: string;
  systemRole: SystemRole;
  organizationRole?: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  org?: string | null;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        role: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is deactivated');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);

    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const organizationRole =
      user.role.name === 'OWNER' ||
      user.role.name === 'MANAGER' ||
      user.role.name === 'EMPLOYEE'
        ? user.role.name
        : undefined;

    const payload: AppJwtPayload = {
      sub: user.id,
      email: user.email,
      systemRole: user.SystemRole,
      organizationRole,
      org: user.organizationId,
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.jwt.signAsync(payload as any, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    const refreshToken = await this.jwt.signAsync(payload as any, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);

    const refreshExp = new Date(
      Date.now() + this.parseMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        refreshTokenHash: refreshHash,
        refreshTokenExp: refreshExp,
      },
    });

    return { accessToken, refreshToken };
  }

  async refresh(refreshToken: string) {
    let payload: AppJwtPayload;

    try {
      payload = await this.jwt.verifyAsync<AppJwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user   || !user.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshTokenExp && user.refreshTokenExp.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);

    if (!ok) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const refreshedPayload: AppJwtPayload = {
      sub: user.id,
      email: user.email,
      systemRole: user.SystemRole,
      organizationRole:
        user.role.name === 'OWNER' ||
        user.role.name === 'MANAGER' ||
        user.role.name === 'EMPLOYEE'
          ? user.role.name
          : undefined,
      org: user.organizationId,
    };

    const accessToken = await this.jwt.signAsync(refreshedPayload as any, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    return { accessToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
        refreshTokenExp: null,
      },
    });

    return { ok: true };
  }

  private parseMs(v: string) {
    const m = /^(\d+)([smhd])$/.exec(v.trim());

    if (!m) {
      return 7 * 24 * 60 * 60 * 1000;
    }

    const n = Number(m[1]);
    const unit = m[2];

    const mult =
      unit === 's'
        ? 1000
        : unit === 'm'
          ? 60 * 1000
          : unit === 'h'
            ? 60 * 60 * 1000
            : 24 * 60 * 60 * 1000;

    return n * mult;
  }
}
