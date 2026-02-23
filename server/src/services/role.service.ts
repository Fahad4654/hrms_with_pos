import prisma from '../config/prisma.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

export class RoleService {
  static async getAllRoles() {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
    return serializeBigInt(roles);
  }

  static async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
      where: { id },
    });
    return serializeBigInt(role);
  }

  static async createRole(data: { name: string; permissions: string[]; level?: number }) {
    const now = toEpoch();
    const role = await prisma.role.create({
      data: {
        ...data,
        level: data.level || 10,
        createdAt: now,
        updatedAt: now,
      },
    });
    return serializeBigInt(role);
  }

  static async updateRole(id: string, data: { name?: string; permissions?: string[]; level?: number }) {
    const role = await prisma.role.update({
      where: { id },
      data: {
        ...data,
        updatedAt: toEpoch(),
      },
    });
    return serializeBigInt(role);
  }

  static async deleteRole(id: string) {
    // Check if role is in use
    const employeeCount = await prisma.employee.count({ where: { roleId: id } });
    if (employeeCount > 0) {
      throw new Error('Cannot delete role that is in use by employees');
    }
    return prisma.role.delete({
      where: { id },
    });
  }
}
