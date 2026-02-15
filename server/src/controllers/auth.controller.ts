import type { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import { LoginSchema } from '../types/shared.js';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  verifyRefreshToken 
} from '../utils/token.js';

export class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const validation = LoginSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ errors: validation.error.format() });
      }

      const { email, password } = validation.data;
      const employee = await prisma.employee.findUnique({ where: { email } });

      if (!employee || !(await bcrypt.compare(password, employee.password))) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const accessToken = generateAccessToken({ id: employee.id, role: employee.role });
      const refreshToken = generateRefreshToken({ id: employee.id, role: employee.role });

      await prisma.employee.update({
        where: { id: employee.id },
        data: { refreshToken }
      });

      res.json({
        accessToken,
        refreshToken,
        employee: {
          id: employee.id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
        },
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    try {
      const decoded = verifyRefreshToken(refreshToken);
      const employee = await prisma.employee.findUnique({
        where: { id: decoded.id }
      });

      if (!employee || employee.refreshToken !== refreshToken) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const newAccessToken = generateAccessToken({ id: employee.id, role: employee.role });
      const newRefreshToken = generateRefreshToken({ id: employee.id, role: employee.role });

      await prisma.employee.update({
        where: { id: employee.id },
        data: { refreshToken: newRefreshToken }
      });

      res.json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      return res.status(403).json({ message: 'Invalid or expired refresh token' });
    }
  }

  static async logout(req: Request, res: Response) {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(204).send();

    try {
      const decoded = verifyRefreshToken(refreshToken);
      await prisma.employee.update({
        where: { id: decoded.id },
        data: { refreshToken: null }
      });
      res.status(244).send(); // Status 204 No Content usually, but let's use 204
    } catch (error) {
      // Even if token is invalid, we don't care on logout
    }
    res.status(204).send();
  }
}
