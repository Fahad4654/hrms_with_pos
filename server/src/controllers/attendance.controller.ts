import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AttendanceService } from '../services/attendance.service.js';

export class AttendanceController {
  static async clockIn(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      
      const { location } = req.body || {};
      const attendance = await AttendanceService.clockIn(req.user.id, location);
      res.status(201).json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async clockOut(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

      const attendance = await AttendanceService.clockOut(req.user.id);
      res.json(attendance);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getLogs(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      const logs = await AttendanceService.getAttendanceLogs(req.user.id, startDate, endDate);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async getEmployeeLogs(req: AuthRequest, res: Response) {
    try {
      const { employeeId } = req.params;
      if (!employeeId) throw new Error('Employee ID is required');

      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;
      
      const logs = await AttendanceService.getAttendanceLogs(employeeId, startDate, endDate);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
