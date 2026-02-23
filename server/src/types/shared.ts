import { z } from 'zod';

export const EmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  roleId: z.string(),
  salary: z.number().nonnegative(),
  joinTimestamp: z.string().optional(),
  employeeId: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  nationality: z.string().optional(),
  dateOfBirth: z.string().optional(),
  designation: z.string().optional(),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;

export const ProductCompanySchema = z.object({
  name: z.string().min(2),
});

export type ProductCompanyInput = z.infer<typeof ProductCompanySchema>;

export const ProductSchema = z.object({
  sku: z.string().optional(),
  name: z.string().min(2),
  categoryId: z.string(),
  companyId: z.string().optional(),
  price: z.number().positive(),
  stockLevel: z.number().int().nonnegative(),
  features: z.string().optional(),
  image: z.string().optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
