import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function debug() {
  const attendance = await prisma.attendance.findMany({
    where: { clockOut: null },
    include: { employee: true }
  });
  console.log('Active Sessions:', JSON.stringify(attendance, null, 2));
}

debug().finally(() => prisma.$disconnect());
