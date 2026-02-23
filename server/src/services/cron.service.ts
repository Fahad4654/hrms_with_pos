
import cron from 'node-cron';
import prisma from '../config/prisma.js';
import { getTodayString, getWorkTimeInUTC, getEndOfDayInUTC, toEpoch, getDateString } from '../utils/time.js';

export const startCronJobs = () => {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    console.log('[Cron] Running auto-clockout check...');
    try {
      const settings = await prisma.companySettings.findFirst();
      if (!settings) return;

      const { workEndTime, enableOvertime, timezone = 'UTC' } = settings;
      const todayString = getTodayString(timezone);
      const nowEpoch = toEpoch();

      // Find all active sessions
      const activeSessions = await prisma.attendance.findMany({
        where: { clockOutTimestamp: null },
      });
      for (const session of activeSessions) {
        const sessionDateString = getDateString(session.clockInTimestamp, timezone);
        
        let shouldClose = false;
        let closeTime = BigInt(0);

        if (enableOvertime) {
          // Overtime Enabled: Close if session is from a previous day
          if (sessionDateString !== todayString) {
             shouldClose = true;
             closeTime = BigInt(getEndOfDayInUTC(session.clockInTimestamp, timezone));
          }
        } else {
          // Overtime Disabled: Close if past workEndTime
          const workEndEpoch = getWorkTimeInUTC(session.clockInTimestamp, workEndTime || '17:00', timezone);

          if (sessionDateString !== todayString) {
            shouldClose = true;
            closeTime = BigInt(workEndEpoch);
          } else if (nowEpoch > workEndEpoch) {
            shouldClose = true;
            closeTime = BigInt(workEndEpoch);
          }
        }

        if (shouldClose) {
          // Ensure closeTime is not before clockIn
          if (closeTime < (session.clockInTimestamp as any)) {
             closeTime = (session.clockInTimestamp as any) + BigInt(1000);
          }
          
          console.log(`[Cron] Auto-closing session ${session.id} for employee ${session.employeeId}. ClockOut: ${closeTime.toString()}`);
          
          await (prisma.attendance as any).update({
            where: { id: session.id },
            data: { clockOutTimestamp: closeTime! as any },
          });
        }
      }
    } catch (error) {
      console.error('[Cron] Error in auto-clockout job:', error);
    }
  });
};
