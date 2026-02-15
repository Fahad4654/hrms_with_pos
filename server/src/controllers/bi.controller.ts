import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { BIService } from '../services/bi.service.js';

export class BIController {
  static async getLaborAnalytics(req: AuthRequest, res: Response) {
    try {
      const analytics = await BIService.getLaborAnalytics();
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getPayroll(req: AuthRequest, res: Response) {
    try {
      const { employeeId, month, year } = req.query;
      if (!employeeId || !month || !year) {
        return res.status(400).json({ message: 'Missing parameters' });
      }
      const payroll = await BIService.generatePayroll(
        employeeId as string,
        parseInt(month as string),
        parseInt(year as string)
      );
      res.json(payroll);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getCommissions(req: AuthRequest, res: Response) {
    try {
      const { employeeId, startDate, endDate } = req.query;
      if (!employeeId || !startDate || !endDate) {
        return res.status(400).json({ message: 'Missing parameters' });
      }
      const commissions = await BIService.calculateCommissions(
        employeeId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(commissions);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
