import type { Request, Response } from 'express';
import { CompanyService } from '../services/company.service.js';

export class CompanyController {
  static async getAll(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder } = req.query;
      const companies = await CompanyService.getAllCompanies({
        page: page as string,
        limit: limit as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });
      res.json(companies);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name } = req.body;
      const company = await CompanyService.createCompany(name);
      res.status(201).json(company);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { name } = req.body;
      const company = await CompanyService.updateCompany(id, name);
      res.json(company);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await CompanyService.deleteCompany(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
