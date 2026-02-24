import type { Request, Response } from 'express';
import { CustomerService } from '../services/customer.service.js';

export class CustomerController {
  static async search(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      const customers = await CustomerService.searchCustomer(query);
      res.json({ data: customers });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
