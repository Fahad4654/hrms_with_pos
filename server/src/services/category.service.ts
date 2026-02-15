import prisma from '../config/prisma.js';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';

export class CategoryService {
  static async getAllCategories(params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    
    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
        include: { _count: { select: { products: true } } }
      }),
      prisma.category.count(),
    ]);

    return {
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
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
