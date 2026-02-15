import prisma from '../config/prisma.js';

export class RoleService {
  static async getAllRoles() {
    return prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async getRoleById(id: string) {
    return prisma.role.findUnique({
      where: { id },
    });
  }

  static async createRole(data: { name: string; permissions: string[] }) {
    return prisma.role.create({
      data,
    });
  }

  static async updateRole(id: string, data: { name?: string; permissions?: string[] }) {
    return prisma.role.update({
      where: { id },
      data,
    });
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
