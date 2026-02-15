import type { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service.js';
import { EmployeeSchema } from '../types/shared.js';

export class EmployeeController {
  static async getAll(req: Request, res: Response) {
    try {
      const { page, limit, sortBy, sortOrder, search } = req.query;
      const result = await EmployeeService.getAllEmployees({
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

  static async getById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      if (!id) return res.status(400).json({ message: 'ID is required' });
      const employee = await EmployeeService.getEmployeeById(id);
      if (!employee) return res.status(404).json({ message: 'Employee not found' });
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const validation = EmployeeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.format() });
      }
      const employee = await EmployeeService.createEmployee(validation.data);
      res.status(201).json(employee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const employee = await EmployeeService.updateEmployee(id, req.body);
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await EmployeeService.deleteEmployee(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
