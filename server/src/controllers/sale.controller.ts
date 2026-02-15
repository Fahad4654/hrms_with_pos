import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { SaleService } from '../services/sale.service.js';

export class SaleController {
  static async checkout(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      
      const { items } = req.body;
      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: 'Cart is empty' });
      }

      const sale = await SaleService.createSale(req.user.id, items);
      res.status(201).json(sale);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getHistory(req: AuthRequest, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = req.query;
      const result = await SaleService.getTransactionHistory({
        page: page as string,
        limit: limit as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
        search: search as string,
      });
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
