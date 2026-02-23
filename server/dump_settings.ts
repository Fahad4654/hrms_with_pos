import 'dotenv/config';
import prisma from './src/config/prisma.js';
async function main() {
  const settings = await prisma.companySettings.findFirst();
  console.log('--- COMPANY SETTINGS ---');
  console.log(JSON.stringify(settings, (k, v) => typeof v === 'bigint' ? v.toString() : v, 2));
}
main().catch(console.error).finally(() => process.exit(0));
