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
      throw new Error('Already clocked in');
    }

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
    return prisma.attendance.findMany({
      where: { employeeId },
      orderBy: { clockIn: 'desc' },
    });
  }
}
