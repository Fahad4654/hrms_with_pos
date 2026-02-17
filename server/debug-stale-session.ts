
import { AttendanceService } from './src/services/attendance.service.js';
import prisma from './src/config/prisma.js';

async function main() {
  console.log('--- Debugging Stale Session Handling ---');
  
  // 1. Get/Create a test employee
  const employee = await prisma.employee.findFirst();
  if (!employee) {
      console.log('No employee found.');
      return;
  }
  const employeeId = employee.id;
  console.log(`Testing for Employee: ${employee.name} (${employeeId})`);

  // 2. Clean up any existing sessions
  await prisma.attendance.deleteMany({ where: { employeeId } });
  console.log('Cleaned up existing sessions.');

  // 3. Create a "Stale" session (Yesterday 09:00 AM)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(9, 0, 0, 0);
  
  const staleSession = await prisma.attendance.create({
      data: {
          employeeId,
          clockIn: yesterday,
          clockOut: null // Forgot to clock out
      }
  });
  console.log(`Created Stale Session: ID=${staleSession.id}, ClockIn=${staleSession.clockIn.toISOString()}`);

  // 4. Attempt to Clock In "Today"
  console.log('Attempting to Clock In specific (simulating today)...');
  try {
      const newSession = await AttendanceService.clockIn(employeeId);
      console.log(`Clock-In Successful! New Session ID=${newSession.id}, ClockIn=${newSession.clockIn.toISOString()}`);
  } catch (error) {
      console.error('Clock-In Failed:', error);
  }

  // 5. Verify Stale Session is Closed
  const updatedStaleSession = await prisma.attendance.findUnique({ where: { id: staleSession.id } });
  if (updatedStaleSession?.clockOut) {
      console.log(`SUCCESS: Stale session was auto-closed at ${updatedStaleSession.clockOut.toISOString()}`);
  } else {
      console.error('FAILURE: Stale session is STILL ACTIVE.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
