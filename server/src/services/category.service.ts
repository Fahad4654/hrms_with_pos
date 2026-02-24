import prisma from '../config/prisma.js';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

export class CategoryService {
  static async getAllCategories(params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    
    // SQLite uses basic contains, we don't need mode: 'insensitive' for simple matching if the collation handles it,
    // but Prisma typically doesn't support mode: 'insensitive' on SQLite natively anyway, so we just use contains.
    const where = params.search ? { name: { contains: params.search } } : {};
    
    // Handle custom sorting for products count
    let prismaOrderBy: any = orderBy || { name: 'asc' };
    if (params.sortBy === 'productsCount') {
      prismaOrderBy = { products: { _count: params.sortOrder || 'asc' } };
    }

    const [categories, total] = await Promise.all([
      prisma.category.findMany({
        where,
        skip,
        take,
        orderBy: prismaOrderBy,
        include: { _count: { select: { products: true } } }
      }),
      prisma.category.count({ where }),
    ]);

    return serializeBigInt({
      data: categories,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static async getCategoryById(id: string) {
    return prisma.category.findUnique({
      where: { id },
    });
  }

  static async createCategory(name: string) {
    const now = toEpoch();
    const category = await prisma.category.create({
      data: { 
        name,
        createdAt: now,
        updatedAt: now,
      },
    });
    return serializeBigInt(category);
  }

  static async updateCategory(id: string, name: string) {
    const category = await prisma.category.update({
      where: { id },
      data: { 
        name,
        updatedAt: toEpoch()
      },
    });
    return serializeBigInt(category);
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
