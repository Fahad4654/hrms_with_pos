import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { AttendanceService } from '../services/attendance.service.js';

export class AttendanceController {
  static async clockIn(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
      
      const attendance = await AttendanceService.clockIn(req.user.id, req.body.location);
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
      
      const logs = await AttendanceService.getAttendanceLogs(req.user.id);
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
