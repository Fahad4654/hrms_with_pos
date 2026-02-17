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
      console.log(`[AttendanceService] Clock-in rejected for employee ${employeeId}: Already has active session ${activeSession.id}`);
      throw new Error('Already clocked in');
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

    const groupedLogs: Record<string, any> = {};

    for (const log of rawLogs) {
      // Get date string YYYY-MM-DD
      const date = new Date(log.clockIn).toISOString().split('T')[0] as string;

      if (!groupedLogs[date]) {
        groupedLogs[date] = {
          date,
          firstClockIn: log.clockIn,
          lastClockOut: log.clockOut,
          totalDuration: 0,
          isActive: !log.clockOut,
          sessions: [],
        };
      }

      // Update lastClockOut if this session ended later (or is active)
      if (log.clockOut) {
        // If we have a clockOut, update lastClockOut if it's later than current
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

    // Convert object to array and sort desc by date
    return Object.values(groupedLogs).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }
}
