import prisma, { Prisma } from '../config/prisma.js';
import type { EmployeeInput } from '../types/shared.js';
import bcrypt from 'bcrypt';

export class EmployeeService {
  static async getAllEmployees() {
    return prisma.employee.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        salary: true,
        createdAt: true,
      },
    });
  }

  static async getEmployeeById(id: string) {
    return prisma.employee.findUnique({
      where: { id },
      include: {
        attendance: true,
        leaveRequests: true,
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
      },
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
    return prisma.employee.update({
      where: { id },
      data: updateData,
    });
  }

  static async deleteEmployee(id: string) {
    return prisma.employee.delete({
      where: { id },
    });
  }
}
