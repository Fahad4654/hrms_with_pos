import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/token.js';
import prisma from '../config/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = verifyAccessToken(token);
    
    // Fetch fresh user data with current permissions from database
    const employee = await prisma.employee.findUnique({
      where: { id: decoded.id },
      include: { role: true }
    });

    if (!employee) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = {
      id: employee.id,
      role: employee.role.name,
      permissions: employee.role.permissions
    };
    
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role as string)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};

// New permission-based authorization
export const authorizePermission = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(403).json({ message: 'Access denied: Not authenticated' });
    }

    const userPermissions = req.user.permissions || [];
    
    // Check if user has 'all' permission or any of the required permissions
    const hasPermission = userPermissions.includes('all') || 
                         requiredPermissions.some(perm => userPermissions.includes(perm));

    if (!hasPermission) {
      return res.status(403).json({ 
        message: 'Access denied: Insufficient permissions',
        required: requiredPermissions,
        userHas: userPermissions
      });
    }

    next();
  };
};
