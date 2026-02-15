import { z } from 'zod';

export const EmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  roleId: z.string(),
  salary: z.number().nonnegative(),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;

export const ProductSchema = z.object({
  sku: z.string().min(3),
  name: z.string().min(2),
  categoryId: z.string(),
  price: z.number().positive(),
  stockLevel: z.number().int().nonnegative(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
