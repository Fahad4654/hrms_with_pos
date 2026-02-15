import prisma from '../config/prisma.js';
import { LeaveStatus } from '@prisma/client';

export class LeaveService {
  static async requestLeave(employeeId: string, data: { startDate: Date, endDate: Date, type: string, reason?: string }) {
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
}
