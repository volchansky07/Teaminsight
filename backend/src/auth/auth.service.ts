import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { SystemRole } from '@prisma/client';

export interface AppJwtPayload {
  sub: string;
  email: string;
  role: SystemRole | 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  systemRole: SystemRole;
  organizationRole?: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
  organizationId?: string | null;
  org?: string | null;
  mustChangePassword?: boolean;
  exp?: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    console.log('LOGIN INPUT:', {
      email,
      password,
    });

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { role: true },
    });

    console.log('LOGIN USER FOUND:', !!user, user?.email, user?.isActive);

    if (!user) {
      console.log('LOGIN FAIL: user not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      console.log('LOGIN FAIL: user deactivated');
      throw new UnauthorizedException('User is deactivated');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log('LOGIN PASSWORD CHECK:', ok);

    if (!ok) {
      console.log('LOGIN FAIL: password mismatch');
      throw new UnauthorizedException('Invalid credentials');
    }

    const organizationRole =
      user.role?.name === 'OWNER' ||
      user.role?.name === 'MANAGER' ||
      user.role?.name === 'EMPLOYEE'
        ? user.role.name
        : undefined;

    const tokens = await this.generateTokens({
      id: user.id,
      email: user.email,
      systemRole: user.SystemRole,
      organizationRole,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
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

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        systemRole: user.SystemRole,
        organizationRole,
        organizationId: user.organizationId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async refresh(refreshToken: string) {
    let payload: AppJwtPayload;

    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET!,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { role: true },
    });

    if (!user || !user.refreshTokenHash || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.refreshTokenExp && user.refreshTokenExp.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const ok = await bcrypt.compare(refreshToken, user.refreshTokenHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const organizationRole =
      user.role?.name === 'OWNER' ||
      user.role?.name === 'MANAGER' ||
      user.role?.name === 'EMPLOYEE'
        ? user.role.name
        : undefined;

    const refreshed = await this.generateTokens({
      id: user.id,
      email: user.email,
      systemRole: user.SystemRole,
      organizationRole,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword,
    });

    const refreshHash = await bcrypt.hash(refreshed.refreshToken, 10);
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

    return {
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        systemRole: user.SystemRole,
        organizationRole,
        organizationId: user.organizationId,
        mustChangePassword: user.mustChangePassword,
      },
    };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const organizationRole =
      user.role?.name === 'OWNER' ||
      user.role?.name === 'MANAGER' ||
      user.role?.name === 'EMPLOYEE'
        ? user.role.name
        : undefined;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      systemRole: user.SystemRole,
      organizationRole,
      organizationId: user.organizationId,
      mustChangePassword: user.mustChangePassword,
      isActive: user.isActive,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    if (newPassword !== confirmPassword) {
      console.log('CHANGE PASSWORD FAIL: mismatch');
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    if (newPassword.length < 6) {
      console.log('CHANGE PASSWORD FAIL: too short');
      throw new BadRequestException(
        'New password must contain at least 6 characters',
      );
    }

    if (currentPassword === newPassword) {
      console.log('CHANGE PASSWORD FAIL: same as current');
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user) {
      console.log('CHANGE PASSWORD FAIL: user not found');
      throw new NotFoundException('User not found');
    }

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      include: { role: true },
    });

    const organizationRole =
      updatedUser.role?.name === 'OWNER' ||
      updatedUser.role?.name === 'MANAGER' ||
      updatedUser.role?.name === 'EMPLOYEE'
        ? updatedUser.role.name
        : undefined;

    const tokens = await this.generateTokens({
      id: updatedUser.id,
      email: updatedUser.email,
      systemRole: updatedUser.SystemRole,
      organizationRole,
      organizationId: updatedUser.organizationId,
      mustChangePassword: updatedUser.mustChangePassword,
    });

    const refreshHash = await bcrypt.hash(tokens.refreshToken, 10);
    const refreshExp = new Date(
      Date.now() + this.parseMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'),
    );

    await this.prisma.user.update({
      where: { id: updatedUser.id },
      data: {
        refreshTokenHash: refreshHash,
        refreshTokenExp: refreshExp,
      },
    });

    console.log('CHANGE PASSWORD SUCCESS');

    return {
      message: 'Password changed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        systemRole: updatedUser.SystemRole,
        organizationRole,
        organizationId: updatedUser.organizationId,
        mustChangePassword: updatedUser.mustChangePassword,
      },
    };
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

  private async generateTokens(user: {
    id: string;
    email: string;
    systemRole: SystemRole;
    organizationRole?: 'OWNER' | 'MANAGER' | 'EMPLOYEE';
    organizationId?: string | null;
    mustChangePassword?: boolean;
  }) {
    const effectiveRole =
      user.systemRole === 'SUPER_ADMIN'
        ? 'SUPER_ADMIN'
        : user.organizationRole ?? 'EMPLOYEE';

    const payload: AppJwtPayload = {
      sub: user.id,
      email: user.email,
      role: effectiveRole,
      systemRole: user.systemRole,
      organizationRole: user.organizationRole,
      organizationId: user.organizationId ?? null,
      org: user.organizationId ?? null,
      mustChangePassword: Boolean(user.mustChangePassword),
    };

    const accessToken = await this.jwt.signAsync(payload as any, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    const refreshToken = await this.jwt.signAsync(payload as any, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });

    return { accessToken, refreshToken };
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
