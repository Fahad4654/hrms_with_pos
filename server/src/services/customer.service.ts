import prisma from '../config/prisma.js';
import { toEpoch, serializeBigInt } from '../utils/time.js';

export class CustomerService {
  static async searchCustomer(query: string) {
    if (!query || query.length < 3) {
      return [];
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { phone: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ]
      },
      take: 10
    });

    return serializeBigInt(customers);
  }
}
