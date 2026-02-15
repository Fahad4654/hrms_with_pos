import type { Request, Response } from 'express';
import { RoleService } from '../services/role.service.js';
import type { AuthRequest } from '../middleware/auth.js';

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
      const { name, permissions, level } = req.body;
      const requestorLevel = (req as AuthRequest).user?.level;
      
      console.log('DEBUG: Create Role Check', { 
        requestorLevel, 
        newRoleLevel: level, 
        user: (req as AuthRequest).user 
      });

      // Hierarchy Check
      // Level 1 can create any role (including Level 1)
      // Level > 1 can ONLY create roles with level > requestorLevel (Strictly Lower Hierarchy)
      if (requestorLevel !== undefined && requestorLevel > 1) {
        if (level <= requestorLevel) {
          return res.status(403).json({ message: 'Access denied: You can only create roles with a lower hierarchy level (higher number) than your own.' });
        }
      }

      const role = await RoleService.createRole({ name, permissions, level });
      res.status(201).json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { level } = req.body;
      const requestorLevel = (req as AuthRequest).user?.level;
      
      const targetRole = await RoleService.getRoleById(id);

      // Hierarchy Check
      if (requestorLevel !== undefined && requestorLevel > 1) {
         // Check 1: Cannot edit a role that is already higher/equal to requestor
         if (targetRole && requestorLevel >= targetRole.level) {
           return res.status(403).json({ message: 'Access denied: Cannot edit a role with higher or equal hierarchy level than your own.' });
         }

         // Check 2: Cannot update a role to have a level higher/equal to requestor
         if (level !== undefined && level <= requestorLevel) {
           return res.status(403).json({ message: 'Access denied: Cannot promote a role to higher or equal hierarchy level than your own.' });
         }
      }

      const role = await RoleService.updateRole(id, req.body);
      res.json(role);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      
      // Hierarchy Check
      const requestorLevel = (req as AuthRequest).user?.level;

      // Hierarchy Check
      if (requestorLevel !== undefined && requestorLevel > 1) {
        const targetRole = await RoleService.getRoleById(id);
        if (targetRole && requestorLevel >= targetRole.level) {
           return res.status(403).json({ message: 'Access denied: Cannot delete a role with higher or equal hierarchy level than your own.' });
        }
      }

      await RoleService.deleteRole(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
