import type { Request, Response } from 'express';
import { EmployeeService } from '../services/employee.service.js';
import { RoleService } from '../services/role.service.js';
import type { AuthRequest } from '../middleware/auth.js';
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

      const requestorLevel = (req as AuthRequest).user?.level;
      const { roleId } = validation.data;

      // Hierarchy Check for Role Assignment
      if (requestorLevel !== undefined && requestorLevel > 1) {
          const roleToAssign = await RoleService.getRoleById(roleId);
          if (!roleToAssign) {
              return res.status(400).json({ message: 'Invalid role ID' });
          }
          if (roleToAssign.level <= requestorLevel) {
              return res.status(403).json({ message: 'Access denied: You can only assign roles with a lower hierarchy level (higher number) than your own.' });
          }
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
      const requestorLevel = (req as AuthRequest).user?.level;
      const { roleId } = req.body;

      // Hierarchy Check
      const targetEmployee = await EmployeeService.getEmployeeById(id);
      
      if (targetEmployee && targetEmployee.role) {
         if (requestorLevel !== undefined && requestorLevel > 1) {
             // 1. Check if user can edit this employee
             if (requestorLevel >= targetEmployee.role.level) {
                 if ((req as AuthRequest).user?.id !== targetEmployee.id) {
                     return res.status(403).json({ message: 'Access denied: You can only edit employees with a lower hierarchy level than your own.' });
                 }
             }
             
             // 2. Check if user is trying to change role
             if (roleId && roleId !== targetEmployee.roleId) {
                  const roleToAssign = await RoleService.getRoleById(roleId);
                  if (!roleToAssign) {
                      return res.status(400).json({ message: 'Invalid role ID' });
                  }
                  if (roleToAssign.level <= requestorLevel) {
                      return res.status(403).json({ message: 'Access denied: You can only assign roles with a lower hierarchy level (higher number) than your own.' });
                  }
             }
         }
      }

      const employee = await EmployeeService.updateEmployee(id, req.body);
      res.json(employee);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const requestorLevel = (req as AuthRequest).user?.level;

      // Hierarchy Check
      const targetEmployee = await EmployeeService.getEmployeeById(id);
      if (targetEmployee && targetEmployee.role) {
         // Level 1 (Super Admin) can delete anyone.
         // Others can only delete employees with strictly lower hierarchy (higher level number).
         if (requestorLevel !== undefined && requestorLevel > 1) {
            if (requestorLevel >= targetEmployee.role.level) {
                return res.status(403).json({ message: 'Access denied: You can only delete employees with a lower hierarchy level than your own.' });
            }
         }
      }

      await EmployeeService.deleteEmployee(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
