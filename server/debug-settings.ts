import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL || "postgresql://hrms_pos_user:hrms_pos_password@localhost:5432/hrms_pos_db";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Debugging Settings Service ---');
  // ... (rest of code)
  console.log('Prisma Keys:', Object.keys(prisma));
  
  // @ts-ignore
  if ('companySettings' in prisma) {
      console.log('companySettings model exists on client.');
  } else {
      console.error('companySettings model MISSING on client.');
  }

  try {
    // @ts-ignore
    const settings = await prisma.companySettings.findFirst();
    console.log('Company Settings:', settings);
  } catch (error) {
    console.error('Error fetching company settings:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
        await prisma.$disconnect();
  });
