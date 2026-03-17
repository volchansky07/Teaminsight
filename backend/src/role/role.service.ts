import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async create(name: string, description?: string) {
    console.log('CREATE ROLE:', name); // временная проверка

    return this.prisma.role.create({
      data: {
        name,
        description: description ?? null,
      },
    });
  }

  async findAll() {
    return this.prisma.role.findMany();
  }

  async findByName(name: string) {
    return this.prisma.role.findUnique({
      where: { name },
    });
  }
}
