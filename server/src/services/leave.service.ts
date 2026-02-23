import prisma from '../config/prisma.js';
import { LeaveStatus, Prisma } from '@prisma/client';
import { type PaginationParams, getPaginationOptions } from '../utils/pagination.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';
import dayjs from 'dayjs';

export class LeaveService {
  static async requestLeave(employeeId: string, data: { startTimestamp: number | Date, endTimestamp: number | Date, type: string, reason?: string }) {
    // 1. Date Validation using dayjs
    const start = dayjs(data.startTimestamp).startOf('day');
    const end = dayjs(data.endTimestamp).startOf('day');

    if (start.isAfter(end)) {
      throw new Error('Start date cannot be later than end date');
    }

    const duration = end.diff(start, 'day') + 1;

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
      const s = dayjs(Number(req.startTimestamp)).startOf('day');
      const e = dayjs(Number(req.endTimestamp)).startOf('day');
      return acc + (e.diff(s, 'day') + 1);
    }, 0);

    if (daysTaken + duration > leaveType.daysAllowed) {
      throw new Error(`Insufficient leave balance. Remaining: ${leaveType.daysAllowed - daysTaken} days, Requested: ${duration} days`);
    }

    const now = BigInt(toEpoch());
    const request = await prisma.leaveRequest.create({
      data: {
        employeeId,
        startTimestamp: BigInt(start.valueOf()),
        endTimestamp: BigInt(end.valueOf()),
        type: data.type,
        reason: data.reason ?? null,
        status: LeaveStatus.PENDING,
      },
    });
    return serializeBigInt(request);
  }

  static async updateLeaveStatus(leaveId: string, status: LeaveStatus) {
    const request = await prisma.leaveRequest.update({
      where: { id: leaveId },
      data: { status },
    });
    return serializeBigInt(request);
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

    return serializeBigInt(await this.enrichLeaveRequests(pendingRequests));
  }

  private static async enrichLeaveRequests(requests: any[]) {
    const leaveTypes = await prisma.leaveType.findMany({ where: { active: true } });

    return Promise.all(requests.map(async (req) => {
      const s = dayjs(Number(req.startTimestamp)).startOf('day');
      const e = dayjs(Number(req.endTimestamp)).startOf('day');
      const daysRequested = e.diff(s, 'day') + 1;

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
            const rs = dayjs(Number(r.startTimestamp)).startOf('day');
            const re = dayjs(Number(r.endTimestamp)).startOf('day');
            return acc + (re.diff(rs, 'day') + 1);
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
        const s = dayjs(Number(req.startTimestamp)).startOf('day');
        const e = dayjs(Number(req.endTimestamp)).startOf('day');
        return acc + (e.diff(s, 'day') + 1);
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
