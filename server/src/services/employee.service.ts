import prisma, { Prisma } from '../config/prisma.js';
import type { EmployeeInput } from '../types/shared.js';
import bcrypt from 'bcrypt';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';

export class EmployeeService {
  static async getAllEmployees(params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    const { search } = params;

    const where: Prisma.EmployeeWhereInput = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    } : {};

    let orderByClause: any = orderBy || { createdAt: 'desc' };
    if (params.sortBy === 'role') {
      orderByClause = { role: { name: params.sortOrder || 'asc' } };
    } else if (orderBy) {
      orderByClause = orderBy;
    }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        include: {
          role: {
            select: {
              id: true,
              name: true,
              permissions: true,
            }
          }
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getEmployeeById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        attendance: true,
        leaveRequests: true,
        role: true,
      },
    });
  }

  static async createEmployee(data: EmployeeInput) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    return prisma.employee.create({
      data: {
        ...data,
        password: hashedPassword,
        salary: new Prisma.Decimal(data.salary),
        joinTimestamp: data.joinTimestamp ? new Date(data.joinTimestamp) : null,
      },
      include: { role: true },
    });
  }

  static async updateEmployee(id: string, data: Partial<EmployeeInput>) {
    const updateData: any = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.salary !== undefined) {
      updateData.salary = String(data.salary);
    }
    if (data.joinTimestamp !== undefined) {
      updateData.joinTimestamp = data.joinTimestamp ? new Date(data.joinTimestamp) : null;
    }
    return prisma.employee.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
  }

  static async deleteEmployee(id: string) {
    return prisma.employee.delete({
      where: { id },
    });
  }
}
