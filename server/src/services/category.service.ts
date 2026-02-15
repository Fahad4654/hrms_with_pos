import prisma from '../config/prisma.js';

export class CategoryService {
  static async getAllCategories() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  static async getCategoryById(id: string) {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  static async createCategory(name: string) {
    return prisma.category.create({
      data: { name },
    });
  }

  static async updateCategory(id: string, name: string) {
    return prisma.category.update({
      where: { id },
      data: { name },
    });
  }

  static async deleteCategory(id: string) {
    // Check if category is in use
    const productCount = await prisma.product.count({ where: { categoryId: id } });
    if (productCount > 0) {
      throw new Error('Cannot delete category that has products');
    }
    return prisma.category.delete({
      where: { id },
    });
  }
}
