import prisma, { Prisma } from '../config/prisma.js';
import type { PaginationParams } from '../utils/pagination.js';
import { getPaginationOptions } from '../utils/pagination.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  priceAtSale: number;
}

export interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export class SaleService {
  static async createSale(employeeId: string, items: SaleItemInput[], customerInfo?: CustomerInput) {
    return prisma.$transaction(async (tx: any) => {
      // 1. Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += item.quantity * item.priceAtSale;
      }

      // 1.5 Handle Customer
      let customerId = null;
      if (customerInfo && customerInfo.name) {
        const { name, email, phone, address } = customerInfo;
        
        // Try to find an existing customer by phone or email if provided
        let existingCustomer = null;
        if (phone || email) {
          existingCustomer = await tx.customer.findFirst({
            where: {
              OR: [
                ...(phone ? [{ phone }] : []),
                ...(email ? [{ email }] : [])
              ]
            }
          });
        }

        if (existingCustomer) {
          // Update missing info if necessary
          const updateData: any = {};
          if (!existingCustomer.phone && phone) updateData.phone = phone;
          if (!existingCustomer.email && email) updateData.email = email;
          if (!existingCustomer.address && address) updateData.address = address;
          
          if (Object.keys(updateData).length > 0) {
            existingCustomer = await tx.customer.update({
              where: { id: existingCustomer.id },
              data: { ...updateData, updatedAt: toEpoch() }
            });
          }
          customerId = existingCustomer.id;
        } else {
          // Create new customer
          const now = toEpoch();
          const newCustomer = await tx.customer.create({
            data: {
              name,
              email: email || null,
              phone: phone || null,
              address: address || null,
              createdAt: now,
              updatedAt: now
            }
          });
          customerId = newCustomer.id;
        }
      }

      // 2. Create the Sale record
      const sale = await tx.sale.create({
        data: {
          employeeId,
          ...(customerId ? { customerId } : {}),
          totalAmount: new Prisma.Decimal(totalAmount),
          timestamp: BigInt(toEpoch()),
          items: {
            create: items.map((item: any) => ({
              productId: item.productId,
              quantity: item.quantity,
              priceAtSale: new Prisma.Decimal(item.priceAtSale),
            })),
          },
        },
        include: { items: true },
      });

      // 3. Update Inventory for each item
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockLevel: {
              decrement: item.quantity,
            },
          },
        });
      }

      return serializeBigInt(sale);
    });
  }

  static async getTransactionHistory(params: PaginationParams) {
    const { skip, take, orderBy, page, limit } = getPaginationOptions(params);
    const { search } = params;

    const where: Prisma.SaleWhereInput = search ? {
      employee: {
        name: { contains: search, mode: 'insensitive' }
      }
    } : {};

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        skip,
        take,
        orderBy: orderBy || { timestamp: 'desc' },
        include: {
          employee: { select: { name: true } },
          customer: { select: { name: true, phone: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      }),
      prisma.sale.count({ where }),
    ]);

    return serializeBigInt({
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  }

  static async getEmployeeSales(employeeId: string) {
    return prisma.sale.findMany({
      where: { employeeId },
      include: { items: true },
      orderBy: { timestamp: 'desc' },
    });
  }
}
