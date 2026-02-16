import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
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

  // Seed Roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: {},
    create: { name: 'ADMIN', permissions: ['all'] },
  });
  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: {},
    create: { name: 'MANAGER', permissions: ['employees', 'attendance', 'products', 'sales', 'analytics'] },
  });
  const staffRole = await prisma.role.upsert({
    where: { name: 'STAFF' },
    update: {},
    create: { name: 'STAFF', permissions: ['attendance', 'pos'] },
  });

  const roleList = [adminRole, managerRole, staffRole];

  // Seed Categories
  const catNames = ['Electronics', 'Office', 'Kitchen', 'Apparel', 'Food'];
  const dbCategories: any[] = [];
  for (const name of catNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    dbCategories.push(cat);
  }

  // Seed 20 Employees
  // for (let i = 1; i <= 20; i++) {
  //   const email = `employee${i}@example.com`;
  //   const role = roleList[i % 3];
  //   await prisma.employee.upsert({
  //     where: { email },
  //     update: { roleId: role.id },
  //     create: {
  //       email,
  //       name: `Demo Employee ${i}`,
  //       password: password,
  //       roleId: role.id,
  //       salary: 40000 + (Math.random() * 20000),
  //     },
  //   });
  // }

  // Seed 20 Products
  for (let i = 1; i <= 100; i++) {
    const sku = `SKU-${1000 + i}`;
    const category = dbCategories[i % dbCategories.length];
    await prisma.product.upsert({
      where: { sku },
      update: { categoryId: category.id },
      create: {
        sku,
        name: `Product ${i}`,
        categoryId: category.id,
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
