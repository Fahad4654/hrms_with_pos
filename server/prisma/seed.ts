import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcrypt';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg((pool as any));
const prisma = new PrismaClient({ adapter: (adapter as any) });

async function main() {
  console.log('Starting seed...');
  const saltRounds = 10;
  const password = await bcrypt.hash('password123', saltRounds);

  // Seed 20 Employees
  const roles = [Role.ADMIN, Role.MANAGER, Role.STAFF];
  for (let i = 1; i <= 20; i++) {
    const email = `employee${i}@example.com`;
    await prisma.employee.upsert({
      where: { email },
      update: {},
      create: {
        email,
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
    const sku = `SKU-${1000 + i}`;
    await prisma.product.upsert({
      where: { sku },
      update: {},
      create: {
        sku,
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
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
