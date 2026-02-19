import type { Request, Response } from 'express';
import { SettingsService } from '../services/settings.service.js';

export class SettingsController {
  // Company
  static async getCompany(req: Request, res: Response) {
    try {
      const settings = await SettingsService.getCompanySettings();
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateCompany(req: Request, res: Response) {
    try {
      const { companyName, workDays, workStartTime, workEndTime, enableOvertime, country, timezone, currency } = req.body;
      const settings = await SettingsService.updateCompanySettings({
        companyName,
        workDays,
        workStartTime,
        workEndTime,
        enableOvertime,
        country,
        timezone,
        currency
      });
      res.json(settings);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  // Leave Types
  static async getLeaveTypes(req: Request, res: Response) {
    try {
      const activeOnly = req.query.active === 'true';
      const types = await SettingsService.getLeaveTypes(activeOnly);
      res.json(types);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async createLeaveType(req: Request, res: Response) {
    try {
      const type = await SettingsService.createLeaveType(req.body);
      res.status(201).json(type);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async updateLeaveType(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) throw new Error('ID is required');
      const type = await SettingsService.updateLeaveType(id, req.body);
      res.json(type);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async deleteLeaveType(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) throw new Error('ID is required');
      await SettingsService.deleteLeaveType(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async getLeaveUtilization(req: Request, res: Response) {
    try {
      const name = req.params.name as string;
      if (!name) throw new Error('Leave type name is required');
      const utilization = await SettingsService.getLeaveUtilization(name);
      res.json(utilization);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
