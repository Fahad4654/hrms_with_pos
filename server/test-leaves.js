import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { status: 'PENDING' },
      include: { employee: true }
    });
    console.log('Pending count:', pendingRequests.length);
    if (pendingRequests.length > 0) {
      console.log('First request:', JSON.stringify(pendingRequests[0], null, 2));
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
