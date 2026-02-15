import type { Request, Response } from 'express';
import { RoleService } from '../services/role.service.js';

export class RoleController {
  static async getAll(req: Request, res: Response) {
    try {
      const roles = await RoleService.getAllRoles();
      res.json(roles);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name, permissions } = req.body;
      const role = await RoleService.createRole({ name, permissions });
      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const role = await RoleService.updateRole(id, req.body);
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await RoleService.deleteRole(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
