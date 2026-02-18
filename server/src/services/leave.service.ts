import prisma from '../config/prisma.js';
import { LeaveStatus } from '@prisma/client';

export class LeaveService {
  static async requestLeave(employeeId: string, data: { startDate: Date, endDate: Date, type: string, reason?: string }) {
    // 1. Date Validation
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);

    if (start > end) {
      throw new Error('Start date cannot be later than end date');
    }

    const duration = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 2. Quota Validation
    const leaveType = await prisma.leaveType.findFirst({
      where: { name: data.type, active: true },
    });

    if (!leaveType) {
      throw new Error('Invalid or inactive leave type');
    }

    // Get approved requests for usage
    const approvedRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        type: data.type,
        status: LeaveStatus.APPROVED,
      },
    });

    const daysTaken = approvedRequests.reduce((acc, req) => {
      const s = new Date(req.startDate);
      const e = new Date(req.endDate);
      s.setHours(0,0,0,0);
      e.setHours(0,0,0,0);
      return acc + (Math.ceil(Math.abs(e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }, 0);

    if (daysTaken + duration > leaveType.daysAllowed) {
      throw new Error(`Insufficient leave balance. Remaining: ${leaveType.daysAllowed - daysTaken} days, Requested: ${duration} days`);
    }

    return prisma.leaveRequest.create({
      data: {
        employeeId,
        startDate: data.startDate,
        endDate: data.endDate,
        type: data.type,
        reason: data.reason ?? null,
        status: LeaveStatus.PENDING,
      },
    });
  }

  static async updateLeaveStatus(leaveId: string, status: LeaveStatus) {
    return prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status },
    });
  }

  static async getEmployeeLeaves(employeeId: string) {
    return prisma.leaveRequest.findMany({
      where: { employeeId },
      orderBy: { startDate: 'desc' },
    });
  }

  static async getAllPendingLeaves() {
    return prisma.leaveRequest.findMany({
      where: { status: LeaveStatus.PENDING },
      include: { employee: { select: { name: true, role: true } } },
    });
  }

  static async getLeaveSummary(employeeId: string) {
    // 1. Get all active leave types
    const leaveTypes = await prisma.leaveType.findMany({
      where: { active: true },
    });

    // 2. Get all approved leave requests for this employee
    const approvedRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: LeaveStatus.APPROVED,
      },
    });

    // 3. Calculate usage per type
    const summary = leaveTypes.map((type) => {
      const typeRequests = approvedRequests.filter((r) => r.type === type.name);
      const daysTaken = typeRequests.reduce((acc, req) => {
        const start = new Date(req.startDate);
        const end = new Date(req.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return acc + diffDays;
      }, 0);

      return {
        name: type.name,
        daysAllowed: type.daysAllowed,
        daysTaken,
        daysRemaining: Math.max(0, type.daysAllowed - daysTaken),
      };
    });

    return summary;
  }
}
