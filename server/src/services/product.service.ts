import prisma from '../config/prisma.js';
import { Prisma } from '@prisma/client';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';
import type { ProductInput } from '../types/shared.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

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

    let orderByClause: any = orderBy || { name: 'asc' };
    if (params.sortBy === 'category') {
      orderByClause = { category: { name: params.sortOrder || 'asc' } };
    } else if (orderBy) {
      orderByClause = orderBy;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        include: { category: true, company: true },
      }),
      prisma.product.count({ where }),
    ]);

    return serializeBigInt({
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static async getProductBySku(sku: string) {
    return prisma.product.findUnique({
      where: { sku },
    });
  }

  static async createProduct(data: ProductInput) {
    const now = toEpoch();
    
    // Auto-generate sku if not provided
    let sku = data.sku;
    if (!sku) {
      const lastProduct = await prisma.product.findFirst({
        where: { sku: { startsWith: 'SKU-' } },
        orderBy: { sku: 'desc' },
        select: { sku: true }
      });
      
      let nextNum = 1;
      if (lastProduct?.sku?.startsWith('SKU-')) {
        const parts = lastProduct.sku.split('-');
        if (parts.length > 1 && parts[1]) {
          const currentNum = parseInt(parts[1]);
          if (!isNaN(currentNum)) nextNum = currentNum + 1;
        }
      }
      sku = `SKU-${String(nextNum).padStart(4, '0')}`;
    }

    const { companyId, features, image, ...rest } = data;

    const product = await prisma.product.create({
      data: {
        ...rest,
        sku,
        companyId: companyId || null,
        features: features || null,
        image: image || null,
        price: new Prisma.Decimal(data.price),
        stockLevel: data.stockLevel || 0,
        createdAt: now,
        updatedAt: now,
      },
      include: { category: true, company: true },
    });
    return serializeBigInt(product);
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
    const { price, companyId, features, image, ...rest } = data;
    const updateData: any = { ...rest, updatedAt: toEpoch() };
    if (price !== undefined) {
      updateData.price = String(price);
    }
    if (companyId !== undefined) updateData.companyId = companyId || null;
    if (features !== undefined) updateData.features = features || null;
    if (image !== undefined) updateData.image = image || null;
    
    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true, company: true },
    });
    return serializeBigInt(product);
  }

  static async deleteProduct(id: string) {
    return prisma.product.delete({
      where: { id },
    });
  }

  static async bulkCreateProducts(products: any[]) {
    const now = toEpoch();
    const results = [];

    // Group by category to minimize queries
    const categoryNames = [...new Set(products.map(p => p.category))];
    const categoryMap: Record<string, string> = {};

    for (const name of categoryNames) {
      if (!name) continue;
      let category = await prisma.category.findUnique({ where: { name: String(name) } });
      if (!category) {
        category = await prisma.category.create({
          data: {
            name: String(name),
            createdAt: now,
            updatedAt: now
          }
        });
      }
      categoryMap[String(name)] = category.id;
    }

    // Get last sku number for sequential coding in bulk
    const lastProduct = await prisma.product.findFirst({
      where: { sku: { startsWith: 'SKU-' } },
      orderBy: { sku: 'desc' },
      select: { sku: true }
    });
    let nextNum = 1;
    if (lastProduct?.sku?.startsWith('SKU-')) {
      const parts = lastProduct.sku.split('-');
      if (parts.length > 1 && parts[1]) {
        const currentNum = parseInt(parts[1]);
        if (!isNaN(currentNum)) nextNum = currentNum + 1;
      }
    }

    // Prepare products for insertion
    for (const p of products) {
      const categoryId = categoryMap[p.category] || null;
      if (!categoryId) continue;

      const sku = p.sku || `SKU-${String(nextNum++).padStart(4, '0')}`;

      try {
        const created = await prisma.product.upsert({
          where: { sku: p.sku },
          update: {
            name: p.name,
            price: new Prisma.Decimal(p.price),
            stockLevel: p.stockLevel,
            categoryId,
            updatedAt: now,
          },
          create: {
            sku,
            name: p.name,
            price: new Prisma.Decimal(p.price),
            stockLevel: p.stockLevel,
            categoryId,
            createdAt: now,
            updatedAt: now,
          }
        });
        results.push(created);
      } catch (error) {
        console.error(`Failed to import product ${p.sku}:`, error);
      }
    }

    return serializeBigInt(results);
  }
}
