import { z } from 'zod';

export const RoleEnum = z.enum(['ADMIN', 'MANAGER', 'STAFF']);

export const EmployeeSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  role: RoleEnum.default('STAFF'),
  salary: z.number().nonnegative(),
});

export type EmployeeInput = z.infer<typeof EmployeeSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginSchema>;
