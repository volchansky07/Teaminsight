import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'superadmin2@teaminsight.local';
  const password = 'Superadminvolk06@';
  const fullName = 'Супер-Администратор';

  let organization = await prisma.organization.findFirst({
    where: {
      name: 'System Organization',
    },
  });

  if (!organization) {
    organization = await prisma.organization.create({
      data: {
        name: 'System Organization',
        description: 'Техническая организация для системного администратора',
        isActive: true,
      },
    });
  }

  let role = await prisma.role.findFirst({
    where: {
      name: 'ADMIN',
    },
  });

  if (!role) {
    role = await prisma.role.create({
      data: {
        name: 'ADMIN',
        description: 'Базовая прикладная роль для супер-администратора',
      },
    });
  }

  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log('Супер-администратор уже существует:', email);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      organizationId: organization.id,
      roleId: role.id,
      isActive: true,
      mustChangePassword: false,
      SystemRole: 'SUPER_ADMIN',
    },
    select: {
      id: true,
      fullName: true,
      email: true,
      SystemRole: true,
    },
  });

  console.log('Супер-администратор создан успешно:');
  console.log(user);
  console.log('Логин:', email);
  console.log('Пароль:', password);
}

main()
  .catch((error) => {
    console.error('Ошибка создания супер-админа:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
