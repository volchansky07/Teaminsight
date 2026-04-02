import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        passwordHash: hashedPassword,
        organizationId: dto.organizationId,
        roleId: dto.roleId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async findAllByOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true, organization: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByIdWithinOrganization(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
