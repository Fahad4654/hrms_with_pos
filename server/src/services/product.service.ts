import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';
import type { ProductInput } from '../types/shared.js';

export class ProductService {
  static async getAllProducts(params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    const { search } = params;

    const where: Prisma.ProductWhereInput = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ]
    } : {};

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
        include: { category: true },
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static async getProductBySku(sku: string) {
    return prisma.product.findUnique({
      where: { sku },
    });
  }

  static async createProduct(data: ProductInput) {
    return prisma.product.create({
      data: {
        ...data,
        price: new Prisma.Decimal(data.price),
        stockLevel: data.stockLevel || 0,
      },
      include: { category: true },
    });
  }

  static async updateInventory(id: string, quantityChange: number) {
    return prisma.product.update({
      where: { id },
      data: {
        stockLevel: {
          increment: quantityChange,
        },
      },
    });
  }

  static async updateProduct(id: string, data: Partial<ProductInput>) {
    const updateData: any = { ...data };
    if (data.price !== undefined) {
      updateData.price = String(data.price);
    }
    return prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  static async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }
}
