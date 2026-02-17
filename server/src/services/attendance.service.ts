import prisma from '../config/prisma.js';

export class AttendanceService {
  static async clockIn(employeeId: string, location?: { lat: number; lng: number; ip?: string }) {
    // Check if already clocked in today without clocking out
    const activeSession = await prisma.attendance.findFirst({
      where: {
        employeeId,
        clockOut: null,
      },
    });

    if (activeSession) {
      const sessionDate = new Date(activeSession.clockIn).toDateString();
      const todayDate = new Date().toDateString();

      if (sessionDate === todayDate) {
        console.log(`[AttendanceService] Clock-in rejected for employee ${employeeId}: Already has active session ${activeSession.id}`);
        throw new Error('Already clocked in');
      } else {
        // Stale session from previous day. Auto-close it.
        console.log(`[AttendanceService] Found stale session ${activeSession.id} from ${sessionDate}. Auto-closing.`);
        
        // Get settings to determine end time
        const settings = await prisma.companySettings.findFirst();
        const workEndTime = settings?.workEndTime || '17:00';
        const enableOvertime = settings?.enableOvertime || false;
        
        // Construct clockOut time for that previous day
        let autoClockOutTime = new Date(activeSession.clockIn);

        if (enableOvertime) {
            // If overtime is enabled, auto-clock out at 23:59:59
            autoClockOutTime.setHours(23, 59, 59, 999);
        } else {
             const [endH, endM] = workEndTime.split(':').map(Number);
             autoClockOutTime.setHours(endH, endM, 0, 0);
        }

        // If clockIn was actually AFTER workEndTime (e.g. valid late night work), 
        // fallback to clockIn time + 1 second to avoid negative duration, OR strictly use workEndTime?
        // Let's use max(clockIn, workEndTime) to be safe, or just workEndTime if sensible.
        // Better: if workEndTime < clockIn, maybe set to 23:59:59? 
        // For simplicity: Set to workEndTime. If duration negative, handle it? 
        // Let's ensure it's at least clockIn time.
        if (autoClockOutTime < activeSession.clockIn) {
             autoClockOutTime.setTime(activeSession.clockIn.getTime() + 1000); // 1 sec later
        }

        await prisma.attendance.update({
          where: { id: activeSession.id },
          data: { clockOut: autoClockOutTime },
        });
        console.log(`[AttendanceService] Stale session ${activeSession.id} auto-closed at ${autoClockOutTime.toISOString()}`);
      }
    }

    console.log(`[AttendanceService] Clocking in employee ${employeeId}`);
    return prisma.attendance.create({
      data: {
        employeeId,
        latitude: location?.lat ?? null,
        longitude: location?.lng ?? null,
        ipAddress: location?.ip ?? null,
      },
    });
  }

  static async clockOut(employeeId: string) {
    const activeSession = await prisma.attendance.findFirst({
      where: {
        employeeId,
        clockOut: null,
      },
      orderBy: { clockIn: 'desc' },
    });

    if (!activeSession) {
      throw new Error('No active clock-in session found');
    }

    return prisma.attendance.update({
      where: { id: activeSession.id },
      data: { clockOut: new Date() },
    });
  }

  static async getAttendanceLogs(employeeId: string) {
    const rawLogs = await prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { clockIn: 'asc' }, // Order by asc to process chronologically
    });

    const settings = await prisma.companySettings.findFirst();
    const workDays = settings?.workDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const workStartTime = settings?.workStartTime || '09:00';
    const workEndTime = settings?.workEndTime || '17:00';

    // Parse work hours to minutes for duration calculation
    const [startH, startM] = workStartTime.split(':').map(Number);
    const [endH, endM] = workEndTime.split(':').map(Number);
    const expectedDurationMs = ((endH * 60 + endM) - (startH * 60 + startM)) * 60 * 1000;

    const groupedLogs: Record<string, any> = {};

    for (const log of rawLogs) {
      // Get date string YYYY-MM-DD
      const date = new Date(log.clockIn).toISOString().split('T')[0] as string;

      if (!groupedLogs[date]) {
        // Determine if Off Day
        const dayName = new Date(log.clockIn).toLocaleDateString('en-US', { weekday: 'long' });
        const isOffDay = !workDays.includes(dayName);

        // Determine if Late
        const clockInTime = new Date(log.clockIn);
        const workStartDate = new Date(log.clockIn);
        workStartDate.setHours(startH, startM, 0, 0);
        
        // 15 mins grace period? User didn't specify, but let's be strict for now or add small buffer.
        // Let's say strict > workStartTime is Late.
        const isLate = clockInTime.getTime() > workStartDate.getTime();

        groupedLogs[date] = {
          date,
          firstClockIn: log.clockIn,
          lastClockOut: log.clockOut,
          totalDuration: 0,
          isActive: !log.clockOut,
          sessions: [],
          isOffDay,
          isLate: !isOffDay && isLate, // Only mark late if it's a working day
          overtimeDuration: 0,
        };
      }

      // Update lastClockOut if this session ended later (or is active)
      if (log.clockOut) {
        // ... existing logic ...
        const currentLast = groupedLogs[date].lastClockOut ? new Date(groupedLogs[date].lastClockOut).getTime() : 0;
        const newOut = new Date(log.clockOut).getTime();
        
        if (newOut > currentLast) {
           groupedLogs[date].lastClockOut = log.clockOut;
        }

        // Add duration
        const durationMs = newOut - new Date(log.clockIn).getTime();
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
    return Object.values(groupedLogs).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
