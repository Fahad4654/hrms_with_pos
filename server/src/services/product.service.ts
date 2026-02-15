import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  price: number;
  stockLevel?: number;
}

export class ProductService {
  static async getAllProducts() {
    return prisma.product.findMany({
      orderBy: { name: 'asc' },
    });
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
        price: String(data.price) as any,
        stockLevel: data.stockLevel || 0,
      },
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
    });
  }

  static async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }
}
