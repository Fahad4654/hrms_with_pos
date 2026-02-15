import type { Request, Response } from 'express';
import { CategoryService } from '../services/category.service.js';

export class CategoryController {
  static async getAll(req: Request, res: Response) {
    try {
      const { page, limit } = req.query;
      const categories = await CategoryService.getAllCategories({
        page: page as string,
        limit: limit as string
      });
      res.json(categories);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const { name } = req.body;
      const category = await CategoryService.createCategory(name);
      res.status(201).json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      const { name } = req.body;
      const category = await CategoryService.updateCategory(id, name);
      res.json(category);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const { id } = req.params as { id: string };
      await CategoryService.deleteCategory(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
}
