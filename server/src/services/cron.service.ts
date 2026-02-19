
import cron from 'node-cron';
import prisma from '../config/prisma.js';

export const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Running auto-clockout check...');
    try {
      const settings = await prisma.companySettings.findFirst();
      if (!settings) return;

      const { workEndTime, enableOvertime } = settings;
      const now = new Date();
      const todayString = now.toDateString();

      // Find all active sessions
      const activeSessions = await prisma.attendance.findMany({
        where: { clockOutTimestamp: null },
      });
      for (const session of activeSessions) {
        const sessionDate = new Date(session.clockInTimestamp);
        const sessionDateString = sessionDate.toDateString();
        
        let shouldClose = false;
        let closeTime = new Date(session.clockInTimestamp);

        if (enableOvertime) {
          // Overtime Enabled: Close if session is from a previous day
          // Logic: If today is a differnt day than session day, close it at 23:59:59 of session day
          if (sessionDateString !== todayString) {
             shouldClose = true;
             closeTime.setHours(23, 59, 59, 999);
          }
        } else {
          // Overtime Disabled: Close if past workEndTime
          // Case 1: Session is from previous day -> active for too long -> close at workEndTime of session day
          // Case 2: Session is from today -> check if now > workEndTime
          
          const [endH, endM] = (workEndTime || '17:00').split(':').map(Number);
          const workEndDateTime = new Date(session.clockInTimestamp);
          workEndDateTime.setHours(endH || 17, endM || 0, 0, 0);

          if (sessionDateString !== todayString) {
            // Previous day session, definitely close
            shouldClose = true;
            closeTime = workEndDateTime;
          } else if (now > workEndDateTime) {
            // Today's session, but past work end time
            shouldClose = true;
            closeTime = workEndDateTime;
          }
        }

        if (shouldClose) {
          // Ensure closeTime is not before clockIn
          if (closeTime < session.clockInTimestamp) {
             closeTime = new Date(session.clockInTimestamp.getTime() + 1000);
          }
          
          console.log(`[Cron] Auto-closing session ${session.id} for employee ${session.employeeId}. ClockOut: ${closeTime.toISOString()}`);
          
          await prisma.attendance.update({
            where: { id: session.id },
            data: { clockOutTimestamp: closeTime },
          });
        }
      }
    } catch (error) {
      console.error('[Cron] Error in auto-clockout job:', error);
    }
  });
};
