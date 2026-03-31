import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdminUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    await this.ensureRoleExists(dto.roleId);

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
    }

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const data: Prisma.UserUncheckedCreateInput = {
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      roleId: dto.roleId,
      organizationId: dto.organizationId,
      isActive: true,
      mustChangePassword: true,
      SystemRole: dto.systemRole ?? 'USER',
    };

    if (dto.organizationId) {
      data.organizationId = dto.organizationId;
    }

    const user = await this.prisma.user.create({
      data,
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        mustChangePassword: true,
        SystemRole: true,
        organizationId: true,
        roleId: true,
        createdAt: true,
      },
    });

    return {
      user,
      tempPassword,
    };
  }

  async findAll(query: {
    organizationId?: string;
    systemRole?: 'USER' | 'SUPER_ADMIN';
    isActive?: 'true' | 'false';
    search?: string;
  }) {
    return this.prisma.user.findMany({
      where: {
        organizationId: query.organizationId || undefined,
        SystemRole: query.systemRole || undefined,
        isActive:
          query.isActive === 'true'
            ? true
            : query.isActive === 'false'
              ? false
              : undefined,
        OR: query.search
          ? [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            isActive: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    await this.ensureUserExists(id);

    if (dto.email) {
      const existing = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('User with this email already exists');
      }
    }

    if (dto.roleId) {
      await this.ensureRoleExists(dto.roleId);
    }

    if (dto.organizationId) {
      await this.ensureOrganizationExists(dto.organizationId);
    }

    const data: Prisma.UserUncheckedUpdateInput = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName.trim();
    }

    if (dto.email !== undefined) {
      data.email = dto.email.toLowerCase().trim();
    }

    if (dto.roleId !== undefined) {
      data.roleId = dto.roleId;
    }

    if (dto.organizationId !== undefined) {
      data.organizationId = dto.organizationId;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    if (dto.systemRole !== undefined) {
      data.SystemRole = dto.systemRole;
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async toggleActive(id: string) {
    const user = await this.ensureUserExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: !user.isActive,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
      },
    });
  }

  async resetPassword(id: string) {
    await this.ensureUserExists(id);

    const tempPassword = this.generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        passwordHash: hashedPassword,
        mustChangePassword: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mustChangePassword: true,
      },
    });

    return {
      user,
      tempPassword,
    };
  }

  async forcePasswordChange(id: string) {
    await this.ensureUserExists(id);

    return this.prisma.user.update({
      where: { id },
      data: {
        mustChangePassword: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        mustChangePassword: true,
      },
    });
  }

  private generateTempPassword(length = 10) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let result = '';

    for (let i = 0; i < length; i += 1) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }

    return result;
  }

  private async ensureUserExists(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async ensureOrganizationExists(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  private async ensureRoleExists(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }
}
