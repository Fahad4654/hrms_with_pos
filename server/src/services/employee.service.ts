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
      employeeId: providedId, 
      phone, 
      address, 
      gender, 
      maritalStatus, 
      nationality, 
      designation, 
      image,
      ...rest 
    } = data;

    // Auto-generate employeeId if not provided
    let employeeId = providedId;
    if (!employeeId) {
      const lastEmployee = await prisma.employee.findFirst({
        where: { employeeId: { startsWith: 'EMP-' } },
        orderBy: { employeeId: 'desc' },
        select: { employeeId: true }
      });
      
      let nextNum = 1;
      if (lastEmployee?.employeeId?.startsWith('EMP-')) {
        const parts = lastEmployee.employeeId.split('-');
        if (parts.length > 1 && parts[1]) {
          const currentNum = parseInt(parts[1]);
          if (!isNaN(currentNum)) nextNum = currentNum + 1;
        }
      }
      employeeId = `EMP-${String(nextNum).padStart(4, '0')}`;
    }

    const employee = await prisma.employee.create({
      data: {
        ...rest,
        password: hashedPassword,
        salary: new Prisma.Decimal(data.salary),
        employeeId,
        phone: phone || null,
        address: address || null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        nationality: nationality || null,
        designation: designation || null,
        image: image || null,
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
    const { password, salary, joinTimestamp, dateOfBirth, ...rest } = data;
    const updateData: any = { ...rest, updatedAt: toEpoch() };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    if (salary !== undefined) {
      updateData.salary = String(salary);
    }
    if (joinTimestamp !== undefined) {
      updateData.joinTimestamp = joinTimestamp ? toEpoch(joinTimestamp) : null;
    }
    if (dateOfBirth !== undefined) {
      updateData.dateOfBirth = dateOfBirth ? toEpoch(dateOfBirth) : null;
    }

    // Handle empty strings for nullable fields
    const nullableFields = ['designation', 'phone', 'employeeId', 'address', 'gender', 'maritalStatus', 'nationality', 'image'] as const;
    for (const field of nullableFields) {
      if ((data as any)[field] === "") {
        updateData[field] = null;
      }
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
