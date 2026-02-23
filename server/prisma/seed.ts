import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
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
  const now = Date.now();
  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { updatedAt: BigInt(now) },
    create: { 
      name: 'ADMIN', 
      permissions: ['all'],
      createdAt: BigInt(now),
      updatedAt: BigInt(now)
    },
  });
  const managerRole = await prisma.role.upsert({
    where: { name: 'MANAGER' },
    update: { updatedAt: BigInt(now) },
    create: { 
      name: 'MANAGER', 
      permissions: ['employees', 'attendance', 'products', 'sales', 'analytics'],
      createdAt: BigInt(now),
      updatedAt: BigInt(now)
    },
  });
  const staffRole = await prisma.role.upsert({
    where: { name: 'STAFF' },
    update: { updatedAt: BigInt(now) },
    create: { 
      name: 'STAFF', 
      permissions: ['attendance', 'pos'],
      createdAt: BigInt(now),
      updatedAt: BigInt(now)
    },
  });

  const roleList = [adminRole, managerRole, staffRole];

  // Seed Categories
  const catNames = ['Electronics', 'Office', 'Kitchen', 'Apparel', 'Food'];
  const dbCategories: any[] = [];
  for (const name of catNames) {
    const cat = await prisma.category.upsert({
      where: { name },
      update: { updatedAt: BigInt(now) },
      create: { 
        name,
        createdAt: BigInt(now),
        updatedAt: BigInt(now)
      },
    });
    dbCategories.push(cat);
  }

  // Seed Companies
  const companyNames = ['Sony', 'Apple', 'Dell', 'Logitech', 'Samsung'];
  const dbCompanies: any[] = [];
  for (const name of companyNames) {
    const company = await prisma.productCompany.upsert({
      where: { name },
      update: { updatedAt: BigInt(now) },
      create: { 
        name,
        createdAt: BigInt(now),
        updatedAt: BigInt(now)
      },
    });
    dbCompanies.push(company);
  }

  // Seed 100 Employees
  for (let i = 1; i <= 100; i++) {
    const email = `employee${i}@example.com`;
    const role = roleList[i % 3];
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() - Math.floor(Math.random() * 365));
    const joinTimestamp = BigInt(joinDate.getTime());

    await prisma.employee.upsert({
      where: { email },
      update: { 
        roleId: role.id,
        joinTimestamp,
        updatedAt: BigInt(now)
      },
      create: {
        email,
        name: `Demo Employee ${i}`,
        password: password,
        roleId: role.id,
        salary: 40000 + (Math.random() * 20000),
        joinTimestamp,
        createdAt: BigInt(now),
        updatedAt: BigInt(now)
      },
    });
  }

  // Seed 100 Products
  for (let i = 1; i <= 100; i++) {
    const sku = `SKU-${String(i).padStart(4, '0')}`;
    const category = dbCategories[i % dbCategories.length];
    const company = dbCompanies[i % dbCompanies.length];
    
    await prisma.product.upsert({
      where: { sku },
      update: { 
        categoryId: category.id,
        companyId: company.id,
        updatedAt: BigInt(now)
      },
      create: {
        sku,
        name: `Product ${i}`,
        categoryId: category.id,
        companyId: company.id,
        price: new Prisma.Decimal(10 + (Math.random() * 90)),
        stockLevel: Math.floor(Math.random() * 100),
        features: `Detailed features for product ${i}. Focus on quality and performance.`,
        image: `https://picsum.photos/seed/prod${i}/400/300`,
        createdAt: BigInt(now),
        updatedAt: BigInt(now)
      },
    });
  }

  // Seed Company Settings
  await prisma.companySettings.upsert({
    where: { id: 'default-settings' },
    update: { updatedAt: BigInt(now) },
    create: {
      id: 'default-settings',
      companyName: 'Apex Solutions',
      workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      workStartTime: '09:00',
      workEndTime: '17:00',
      enableOvertime: true,
      country: 'US',
      timezone: 'America/New_York',
      currency: 'USD',
      updatedAt: BigInt(now)
    }
  });

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
