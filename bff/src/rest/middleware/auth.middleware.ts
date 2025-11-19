import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError } from '../../utils/error.util';

declare global {
  namespace Express {
    interface Request {
      token?: string;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    req.token = token;
    
    next();
  } catch (error) {
    next(error);
  }
};
