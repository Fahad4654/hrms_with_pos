
import { AttendanceService } from './src/services/attendance.service.js';
import prisma from './src/config/prisma.js';

async function main() {
  console.log('--- Debugging Attendance Status ---');
  
  // 1. Get an employee ID (use first found)
  const employee = await prisma.employee.findFirst();
  if (!employee) {
      console.log('No employee found.');
      return;
  }
  console.log(`Testing for Employee: ${employee.name} (${employee.id})`);

  // 2. Fetch Logs
  try {
    const logs = await AttendanceService.getAttendanceLogs(employee.id);
    console.log('Attendance Logs:', JSON.stringify(logs, null, 2));
  } catch (error) {
    console.error('Error fetching logs:', error);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
