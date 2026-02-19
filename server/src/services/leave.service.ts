import prisma from '../config/prisma.js';
import { LeaveStatus, Prisma } from '@prisma/client';
import { type PaginationParams, getPaginationOptions } from '../utils/pagination.js';

export class LeaveService {
  static async requestLeave(employeeId: string, data: { startTimestamp: Date, endTimestamp: Date, type: string, reason?: string }) {
    // 1. Date Validation
    const start = new Date(data.startTimestamp);
    const end = new Date(data.endTimestamp);
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
      const s = new Date(req.startTimestamp);
      const e = new Date(req.endTimestamp);
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
        startTimestamp: data.startTimestamp,
        endTimestamp: data.endTimestamp,
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

  static async getEmployeeLeaves(employeeId: string, params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    const { search } = params;

    const where: Prisma.LeaveRequestWhereInput = {
      employeeId,
      ...(search ? {
        OR: [
          { type: { contains: search, mode: 'insensitive' } },
          { reason: { contains: search, mode: 'insensitive' } },
        ]
      } : {})
    };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { startTimestamp: 'desc' },
        include: { 
          employee: { 
            select: { 
              name: true, 
              role: { select: { name: true } },
              id: true
            } 
          } 
        },
      }),
      prisma.leaveRequest.count({ where })
    ]);

    const data = await this.enrichLeaveRequests(requests);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAllLeaveRequests(params: PaginationParams & { status?: string }) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    const { search, status } = params;

    const where: Prisma.LeaveRequestWhereInput = {
      AND: [
        status && status !== 'ALL' ? { status: status as any } : {},
        search ? {
          OR: [
            { employee: { name: { contains: search, mode: 'insensitive' } } },
            { employee: { email: { contains: search, mode: 'insensitive' } } },
            { type: { contains: search, mode: 'insensitive' } },
          ]
        } : {}
      ]
    };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        skip,
        take,
        orderBy: params.sortBy === 'employee'
          ? { employee: { name: params.sortOrder || 'asc' } }
          : (orderBy || { startTimestamp: 'desc' }),
        include: { 
          employee: { 
            select: { 
              name: true, 
              role: { select: { name: true } },
              id: true
            } 
          } 
        },
      }),
      prisma.leaveRequest.count({ where })
    ]);

    const data = await this.enrichLeaveRequests(requests);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getAllPendingLeaves() {
    // Keep this for any internal usage or simple views if needed, 
    // but the main view now uses getAllLeaveRequests
    const pendingRequests = await prisma.leaveRequest.findMany({
      where: { status: LeaveStatus.PENDING },
      include: { 
        employee: { 
          select: { 
            name: true, 
            role: { select: { name: true } },
            id: true
          } 
        } 
      },
    });

    return this.enrichLeaveRequests(pendingRequests);
  }

  private static async enrichLeaveRequests(requests: any[]) {
    const leaveTypes = await prisma.leaveType.findMany({ where: { active: true } });

    return Promise.all(requests.map(async (req) => {
      const daysRequested = Math.ceil(Math.abs(req.endTimestamp.getTime() - req.startTimestamp.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const typeConfig = leaveTypes.find(t => t.name === req.type);
      let daysRemaining = 0;

      if (typeConfig) {
        try {
          const approvedForType = await prisma.leaveRequest.findMany({
            where: {
              employeeId: req.employeeId,
              type: req.type,
              status: LeaveStatus.APPROVED,
            },
          });

          const daysTaken = approvedForType.reduce((acc, r) => {
            return acc + (Math.ceil(Math.abs(r.endTimestamp.getTime() - r.startTimestamp.getTime()) / (1000 * 60 * 60 * 24)) + 1);
          }, 0);

          daysRemaining = Math.max(0, typeConfig.daysAllowed - daysTaken);
        } catch (err) {
          console.error(`Error calculating daysTaken for req ${req.id}:`, err);
        }
      }

      return {
        id: req.id,
        employeeId: req.employeeId,
        startTimestamp: req.startTimestamp,
        endTimestamp: req.endTimestamp,
        type: req.type,
        reason: req.reason,
        status: req.status,
        daysRequested,
        daysRemaining,
        employee: {
          name: req.employee.name,
          role: req.employee.role.name
        }
      };
    }));
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
        const start = new Date(req.startTimestamp);
        const end = new Date(req.endTimestamp);
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
