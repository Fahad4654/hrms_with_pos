import prisma from '../config/prisma.js';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

export class CompanyService {
  static async getAllCompanies(params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    
    const [companies, total] = await Promise.all([
      prisma.productCompany.findMany({
        skip,
        take,
        orderBy: orderBy || { name: 'asc' },
        include: { _count: { select: { products: true } } }
      }),
      prisma.productCompany.count(),
    ]);

    return serializeBigInt({
      data: companies,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static async getCompanyById(id: string) {
    return prisma.productCompany.findUnique({
      where: { id },
    });
  }

  static async createCompany(name: string) {
    const now = toEpoch();
    const company = await prisma.productCompany.create({
      data: { 
        name,
        createdAt: now,
        updatedAt: now,
      },
    });
    return serializeBigInt(company);
  }

  static async updateCompany(id: string, name: string) {
    const company = await prisma.productCompany.update({
      where: { id },
      data: { 
        name,
        updatedAt: toEpoch()
      },
    });
    return serializeBigInt(company);
  }

  static async deleteCompany(id: string) {
    // Check if company is in use
    const productCount = await prisma.product.count({ where: { companyId: id } });
    if (productCount > 0) {
      throw new Error('Cannot delete company that has products');
    }
    return prisma.productCompany.delete({
      where: { id },
    });
  }
}
