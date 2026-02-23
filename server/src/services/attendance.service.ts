import prisma from '../config/prisma.js';
import { getTodayString, getWorkTimeInUTC, getEndOfDayInUTC, toEpoch, serializeBigInt, getDateString } from '../utils/time.js';

export class AttendanceService {
  static async clockIn(employeeId: string, location?: { lat: number; lng: number; ip?: string }) {
    // Check if already clocked in today without clocking out
    const activeSession = await prisma.attendance.findFirst({
      where: {
        employeeId,
        clockOutTimestamp: null,
      },
    });

    if (activeSession) {
      const settings = await prisma.companySettings.findFirst();
      const timezone = settings?.timezone || 'UTC';
      
      const sessionDate = getDateString(activeSession.clockInTimestamp, timezone);
      const todayDate = getTodayString(timezone);

      if (sessionDate === todayDate) {
        console.log(`[AttendanceService] Clock-in rejected for employee ${employeeId}: Already has active session ${activeSession.id}`);
        throw new Error('Already clocked in');
      } else {
        // Stale session from previous day. Auto-close it.
        console.log(`[AttendanceService] Found stale session ${activeSession.id} from ${sessionDate}. Auto-closing.`);
        
        // Construct clockOut time for that previous day
        const workEndTime = settings?.workEndTime || '17:00';
        const enableOvertime = settings?.enableOvertime || false;
        let autoClockOutTime: number;

        if (enableOvertime) {
            // If overtime is enabled, auto-clock out at 23:59:59 of that day
            autoClockOutTime = getEndOfDayInUTC(activeSession.clockInTimestamp, timezone);
        } else {
            autoClockOutTime = getWorkTimeInUTC(activeSession.clockInTimestamp, workEndTime, timezone);
        }

        // If clockIn was actually AFTER workEndTime (e.g. valid late night work), 
        // fallback to clockIn time + 1 second to avoid negative duration, OR strictly use workEndTime?
        // Let's use max(clockIn, workEndTime) to be safe, or just workEndTime if sensible.
        // Better: if workEndTime < clockIn, maybe set to 23:59:59? 
        // For simplicity: Set to workEndTime. If duration negative, handle it? 
        // Let's ensure it's at least clockIn time.
        if (autoClockOutTime < Number(activeSession.clockInTimestamp)) {
             autoClockOutTime = Number(activeSession.clockInTimestamp) + 1000; // 1 sec later
        }

        await (prisma.attendance as any).update({
          where: { id: activeSession.id },
          data: { clockOutTimestamp: BigInt(autoClockOutTime) },
        });
        console.log(`[AttendanceService] Stale session ${activeSession.id} auto-closed at ${new Date(autoClockOutTime).toISOString()}`);
      }
    }

    console.log(`[AttendanceService] Clocking in employee ${employeeId}`);
    const now = toEpoch();
    const session = await (prisma.attendance as any).create({
      data: {
        employeeId,
        clockInTimestamp: BigInt(now),
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        ipAddress: location?.ip ?? null,
      },
    });
    return serializeBigInt(session);
  }

  static async clockOut(employeeId: string) {
    const activeSession = await prisma.attendance.findFirst({
      where: {
        employeeId,
        clockOutTimestamp: null,
      },
      orderBy: { clockInTimestamp: 'desc' },
    });

    if (!activeSession) {
      throw new Error('No active clock-in session found');
    }

    const session = await (prisma.attendance as any).update({
      where: { id: activeSession.id },
      data: { clockOutTimestamp: BigInt(toEpoch()) },
    });
    return serializeBigInt(session);
  }

  static async getAttendanceLogs(employeeId: string) {
    const rawLogs = await prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { clockInTimestamp: 'asc' }, // Order by asc to process chronologically
    });

    const settings = await prisma.companySettings.findFirst();
    const timezone = settings?.timezone || 'UTC';
    const workDays = settings?.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const workStartTime = settings?.workStartTime || '09:00';
    const workEndTime = settings?.workEndTime || '17:00';

    // Parse work hours for duration calculation
    const [startH = 9, startM = 0] = (workStartTime || '09:00').split(':').map(Number);
    const [endH = 17, endM = 0] = (workEndTime || '17:00').split(':').map(Number);
    const expectedDurationMs = ((endH * 60 + endM) - (startH * 60 + startM)) * 60 * 1000;

    const groupedLogs: Record<string, any> = {};

    for (const log of rawLogs) {
      // Get date string YYYY-MM-DD in company timezone
      const date = getDateString(log.clockInTimestamp, timezone);

      if (!groupedLogs[date]) {
        // Determine if Off Day (respecting timezone)
        const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: timezone }).format(Number(log.clockInTimestamp));
        const isOffDay = !workDays.includes(dayName);

        // Determine if Late (respecting timezone)
        const workStartInUTC = getWorkTimeInUTC(log.clockInTimestamp, workStartTime, timezone);
        const isLate = Number(log.clockInTimestamp) > workStartInUTC;

        groupedLogs[date] = {
          date,
          firstClockIn: log.clockInTimestamp,
          lastClockOut: log.clockOutTimestamp,
          totalDuration: 0,
          isActive: !log.clockOutTimestamp,
          sessions: [],
          isOffDay,
          isLate: !isOffDay && isLate, // Only mark late if it's a working day
          overtimeDuration: 0,
        };
      }

      // Update lastClockOut if this session ended later (or is active)
      if (log.clockOutTimestamp) {
        const currentLast = groupedLogs[date].lastClockOut ? Number(groupedLogs[date].lastClockOut) : 0;
        const newOut = Number(log.clockOutTimestamp);
        
        if (newOut > currentLast) {
           groupedLogs[date].lastClockOut = log.clockOutTimestamp;
        }

        // Add duration
        const durationMs = newOut - Number(log.clockInTimestamp);
        groupedLogs[date].totalDuration += durationMs;
      } else {
        // Active session
        groupedLogs[date].isActive = true;
        groupedLogs[date].lastClockOut = null; // Still active
      }

      groupedLogs[date].sessions.push(log);
    }

    // Calculate Overtime for each day
    Object.values(groupedLogs).forEach((log: any) => {
       if (log.totalDuration > expectedDurationMs) {
          log.overtimeDuration = log.totalDuration - expectedDurationMs;
       }
    });

    // Convert object to array and sort desc by date
    return Object.values(groupedLogs)
      .map(serializeBigInt)
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
