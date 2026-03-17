import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = await bcrypt.hash('Admin123!', 10);

  await prisma.user.update({
    where: { email: 'admin@test.com' },
    data: { passwordHash: hash },
  });

  console.log('Password updated to Admin123!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
