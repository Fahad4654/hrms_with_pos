import prisma from '../config/prisma.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';
import dayjs from 'dayjs';

export class SettingsService {
  // --- Company Settings ---

  static async getCompanySettings() {
    const settings = await prisma.companySettings.findFirst();
    if (!settings) {
      const now = toEpoch();
      // Create default if not exists
      return prisma.companySettings.create({
        data: {
          companyName: 'My Company',
          workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          workStartTime: '09:00',
          workEndTime: '17:00',
          enableOvertime: false,
          country: 'US',
          timezone: 'America/New_York',
          currency: 'USD',
          taxPercentage: 8,
          updatedAt: now,
        },
      });
    }
    return serializeBigInt(settings);
  }

  static async updateCompanySettings(data: {
    companyName?: string;
    workDays?: string[];
    workStartTime?: string;
    workEndTime?: string;
    enableOvertime?: boolean;
    country?: string;
    timezone?: string;
    currency?: string;
    taxPercentage?: number;
  }) {
    const settings = await prisma.companySettings.findFirst(); // Direct get to avoid recursion or extra serialization
    if (!settings) throw new Error('Settings not found');
    
    // Validation: Start Time < End Time
    const newStartTime = data.workStartTime || settings.workStartTime;
    const newEndTime = data.workEndTime || settings.workEndTime;

    if (newStartTime >= newEndTime) {
      throw new Error('Work Start Time cannot be later than or equal to Work End Time');
    }

    const updated = await prisma.companySettings.update({
      where: { id: settings.id },
      data: {
        ...data,
        updatedAt: toEpoch()
      },
    });
    return serializeBigInt(updated);
  }

  // --- Leave Types ---

  static async getLeaveTypes(activeOnly = false) {
    const types = await prisma.leaveType.findMany({
      where: activeOnly ? { active: true } : {},
      orderBy: { name: 'asc' },
    });
    return serializeBigInt(types);
  }

  static async createLeaveType(data: { name: string; daysAllowed: number }) {
     // Check for duplicate name
     const existing = await prisma.leaveType.findUnique({ where: { name: data.name } });
     if (existing) throw new Error('Leave type with this name already exists');

     const now = toEpoch();
     const type = await prisma.leaveType.create({ 
       data: {
         ...data,
         createdAt: now,
         updatedAt: now,
       } 
     });
     return serializeBigInt(type);
  }

  static async updateLeaveType(id: string, data: { name?: string; daysAllowed?: number; active?: boolean }) {
    if (data.name) {
       const existing = await prisma.leaveType.findUnique({ where: { name: data.name } });
       if (existing && existing.id !== id) throw new Error('Leave type with this name already exists');
    }
    const type = await prisma.leaveType.update({
      where: { id },
      data: {
        ...data,
        updatedAt: toEpoch()
      },
    });
    return serializeBigInt(type);
  }

  static async deleteLeaveType(id: string) {
    return prisma.leaveType.delete({ where: { id } });
  }

  static async getLeaveUtilization(leaveTypeName: string) {
    // 1. Get all APPROVED leave requests of this type
    // Note: Assuming 'type' in LeaveRequest matches LeaveType 'name'
    const requests = await prisma.leaveRequest.findMany({
      where: {
        type: leaveTypeName,
        status: 'APPROVED',
      },
      include: {
        employee: {
          select: { name: true },
        },
      },
    });

    // 2. Aggregate days per employee
    const utilization: Record<string, number> = {};

    for (const req of requests) {
      // Calculate duration in days using dayjs for clean math
      const start = dayjs(Number(req.startTimestamp)).startOf('day');
      const end = dayjs(Number(req.endTimestamp)).startOf('day');
      const diffDays = end.diff(start, 'day') + 1; 

      const empName = req.employee.name;
      utilization[empName] = (utilization[empName] || 0) + diffDays;
    }

    // 3. Convert to array
    return Object.entries(utilization).map(([employeeName, daysTaken]) => ({
      employeeName,
      daysTaken,
    }));
  }
}
