import prisma from '../config/prisma.js';

export class SettingsService {
  // --- Company Settings ---

  static async getCompanySettings() {
    const settings = await prisma.companySettings.findFirst();
    if (!settings) {
      // Create default if not exists
      return prisma.companySettings.create({
        data: {
          companyName: 'My Company',
          workDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          workStartTime: '09:00',
          workEndTime: '17:00',
          enableOvertime: false,
        },
      });
    }
    return settings;
  }

  static async updateCompanySettings(data: {
    companyName?: string;
    workDays?: string[];
    workStartTime?: string;
    workEndTime?: string;
    enableOvertime?: boolean;
  }) {
    const settings = await this.getCompanySettings(); // Ensure exists
    
    // Validation: Start Time < End Time
    const newStartTime = data.workStartTime || settings.workStartTime;
    const newEndTime = data.workEndTime || settings.workEndTime;

    if (newStartTime >= newEndTime) {
      throw new Error('Work Start Time cannot be later than or equal to Work End Time');
    }

    return prisma.companySettings.update({
      where: { id: settings.id },
      data,
    });
  }

  // --- Leave Types ---

  static async getLeaveTypes(activeOnly = false) {
    return prisma.leaveType.findMany({
      where: activeOnly ? { active: true } : {},
      orderBy: { name: 'asc' },
    });
  }

  static async createLeaveType(data: { name: string; daysAllowed: number }) {
     // Check for duplicate name
     const existing = await prisma.leaveType.findUnique({ where: { name: data.name } });
     if (existing) throw new Error('Leave type with this name already exists');

     return prisma.leaveType.create({ data });
  }

  static async updateLeaveType(id: string, data: { name?: string; daysAllowed?: number; active?: boolean }) {
    if (data.name) {
       const existing = await prisma.leaveType.findUnique({ where: { name: data.name } });
       if (existing && existing.id !== id) throw new Error('Leave type with this name already exists');
    }
    return prisma.leaveType.update({
      where: { id },
      data,
    });
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
      // Calculate duration in days (Inclusive)
      // Reset hours to ensure clean date difference
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 

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
