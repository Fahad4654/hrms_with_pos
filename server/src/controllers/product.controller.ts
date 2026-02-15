import type { Request, Response } from 'express';
import { ProductService } from '../services/product.service.js';

export class ProductController {
  static async getAll(req: Request, res: Response) {
    try {
      const products = await ProductService.getAllProducts();
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async create(req: Request, res: Response) {
    try {
      const product = await ProductService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const product = await ProductService.updateProduct(id, req.body);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }

  static async delete(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      await ProductService.deleteProduct(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async updateStock(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { quantityChange } = req.body;
      const product = await ProductService.updateInventory(id, quantityChange);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  }
}
