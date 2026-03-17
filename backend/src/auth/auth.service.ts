import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

type JwtPayload = {
  sub: string; // userId
  org: string; // organizationId
  role: string; // role name
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    const payload: JwtPayload = {
      sub: user.id,
      org: user.organizationId,
      role: user.role.name,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN as any || '15m',
    });

    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN as any || '7d',
    });

    // храним только хеш refresh
    const refreshHash = await bcrypt.hash(refreshToken, 10);

    // срок действия (для удобства контроля)
    const refreshExp = new Date(Date.now() + this.parseMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));

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
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
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
    if (!ok) throw new UnauthorizedException('Invalid refresh token');

    const newPayload: JwtPayload = {
      sub: user.id,
      org: user.organizationId,
      role: user.role.name,
    };

    const accessToken = await this.jwt.signAsync(newPayload as any, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    // Можно ротировать refresh, но для MVP оставим как есть (без перегруза)
    return { accessToken };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExp: null },
    });
    return { ok: true };
  }

  // минимальный парсер 7d / 15m для refreshExp (только для наших 7d/15m)
  private parseMs(v: string) {
    const m = /^(\d+)([smhd])$/.exec(v.trim());
    if (!m) return 7 * 24 * 60 * 60 * 1000;
    const n = Number(m[1]);
    const unit = m[2];
    const mult =
      unit === 's' ? 1000 :
      unit === 'm' ? 60 * 1000 :
      unit === 'h' ? 60 * 60 * 1000 :
      24 * 60 * 60 * 1000;
    return n * mult;
  }
}
