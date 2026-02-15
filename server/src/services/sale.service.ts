import prisma, { Prisma } from '../config/prisma.js';

export interface SaleItemInput {
  productId: string;
  quantity: number;
  priceAtSale: number;
}

export class SaleService {
  static async createSale(employeeId: string, items: SaleItemInput[]) {
    return prisma.$transaction(async (tx: any) => {
      // 1. Calculate total amount
      let totalAmount = 0;
      for (const item of items) {
        totalAmount += item.quantity * item.priceAtSale;
      }

      // 2. Create the Sale record
      const sale = await tx.sale.create({
        data: {
          employeeId,
          totalAmount: new Prisma.Decimal(totalAmount),
          items: {
            create: items.map(item => ({
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

      return sale;
    });
  }

  static async getTransactionHistory() {
    return prisma.sale.findMany({
      include: {
        employee: { select: { name: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { timestamp: 'desc' },
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
