import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { LeaveService } from '../services/leave.service.js';
import { Prisma } from '../config/prisma.js';

export class LeaveController {
  static async request(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const leave = await LeaveService.requestLeave(req.user.id, {
        ...req.body,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      });
      res.status(201).json(leave);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateStatus(req: AuthRequest, res: Response) {
    try {
      const id = req.params.id as string;
      const { status } = req.body;
      const leave = await LeaveService.updateLeaveStatus(id, status);
      res.json(leave);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getMyLeaves(req: AuthRequest, res: Response) {
    try {
      const result = await LeaveService.getEmployeeLeaves(req.user!.id, req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getAll(req: AuthRequest, res: Response) {
    try {
      const result = await LeaveService.getAllLeaveRequests(req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getSummary(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      const summary = await LeaveService.getLeaveSummary(req.user.id);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
