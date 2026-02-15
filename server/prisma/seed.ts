import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password123', 10);

  // Seed 20 Employees
  const roles = [Role.ADMIN, Role.MANAGER, Role.STAFF];
  for (let i = 1; i <= 20; i++) {
    await prisma.employee.upsert({
      where: { email: `employee${i}@example.com` },
      update: {},
      create: {
        email: `employee${i}@example.com`,
        name: `Demo Employee ${i}`,
        password: password,
        role: roles[i % 3],
        salary: 40000 + (Math.random() * 20000),
      },
    });
  }

  // Seed 20 Products
  const categories = ['Electronics', 'Office', 'Kitchen', 'Apparel'];
  for (let i = 1; i <= 20; i++) {
    await prisma.product.upsert({
      where: { sku: `SKU-${1000 + i}` },
      update: {},
      create: {
        sku: `SKU-${1000 + i}`,
        name: `Product ${i}`,
        category: categories[i % 4],
        price: 10 + (Math.random() * 90),
        stockLevel: Math.floor(Math.random() * 100),
      },
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
