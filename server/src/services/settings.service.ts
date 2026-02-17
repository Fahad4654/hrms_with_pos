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
}
