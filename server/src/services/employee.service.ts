import prisma, { Prisma } from '../config/prisma.js';
import type { EmployeeInput } from '../types/shared.js';
import bcrypt from 'bcrypt';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

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

    let orderByClause: any;
    if (params.sortBy === 'role') {
      orderByClause = [
        { role: { name: params.sortOrder || 'asc' } },
        { name: 'asc' }
      ];
    } else if (params.sortBy) {
      orderByClause = [
        { [params.sortBy]: params.sortOrder || 'asc' },
        { name: 'asc' }
      ];
    } else {
      orderByClause = { createdAt: 'desc' };
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

    return serializeBigInt({
      data: employees,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static async getEmployeeById(id: string) {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        attendance: true,
        leaveRequests: true,
        role: true,
      },
    });
    return serializeBigInt(employee);
  }

  static async createEmployee(data: EmployeeInput) {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const now = toEpoch();
    const { 
      joinTimestamp, 
      dateOfBirth, 
      employeeId, 
      phone, 
      address, 
      gender, 
      maritalStatus, 
      nationality, 
      designation, 
      ...rest 
    } = data;

    const employee = await prisma.employee.create({
      data: {
        ...rest,
        password: hashedPassword,
        salary: new Prisma.Decimal(data.salary),
        employeeId: employeeId || null,
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        nationality: nationality || null,
        designation: designation || null,
        joinTimestamp: joinTimestamp ? toEpoch(joinTimestamp) : null,
        dateOfBirth: dateOfBirth ? toEpoch(dateOfBirth) : null,
        createdAt: now,
        updatedAt: now,
      },
      include: { role: true },
    });
    return serializeBigInt(employee);
  }

  static async updateEmployee(id: string, data: Partial<EmployeeInput>) {
    const updateData: any = { ...data, updatedAt: toEpoch() };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }
    if (data.salary !== undefined) {
      updateData.salary = String(data.salary);
    }
    if (data.joinTimestamp !== undefined) {
      updateData.joinTimestamp = data.joinTimestamp ? toEpoch(data.joinTimestamp) : null;
    }
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? toEpoch(data.dateOfBirth) : null;
    }
    if (data.designation === "") {
      updateData.designation = null;
    }
    if (data.phone === "") {
      updateData.phone = null;
    }
    if (data.employeeId === "") {
      updateData.employeeId = null;
    }
    if (data.address === "") {
      updateData.address = null;
    }
    if (data.gender === "") {
      updateData.gender = null;
    }
    if (data.maritalStatus === "") {
      updateData.maritalStatus = null;
    }
    if (data.nationality === "") {
      updateData.nationality = null;
    }
    const employee = await prisma.employee.update({
      where: { id },
      data: updateData,
      include: { role: true },
    });
    return serializeBigInt(employee);
  }

  static async deleteEmployee(id: string) {
    return prisma.employee.delete({
      where: { id },
    });
  }
}
