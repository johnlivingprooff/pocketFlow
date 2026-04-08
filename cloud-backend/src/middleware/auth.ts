import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { createError } from './errorHandler';

type JwtPayload = {
  sub: string;
  email: string;
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing bearer token', code: 'AUTH_MISSING_TOKEN' });
    return;
  }

  const token = authorization.slice('Bearer '.length);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.authUser = {
      id: payload.sub,
      email: payload.email,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'AUTH_TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID_TOKEN' });
    }
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length);
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      req.authUser = {
        id: payload.sub,
        email: payload.email,
      };
    } catch {
      // Invalid token is ignored for optional auth
    }
  }
  next();
}
