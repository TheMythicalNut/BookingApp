import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? '';
if (! (!!JWT_SECRET) ) throw new Error('JWT_SECRET environment variable is not set');

export interface JwtPayload {
  ownerId: string;
  studioId: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export interface JwtAdminPayload {
  admin: boolean;
}

export interface AdminRequest extends Request {
  admin?: JwtAdminPayload;
}

export function extractToken(
  req: Request,
  res: Response
): jwt.JwtPayload | string | null {
  const authHeader = req.headers['authorization'];

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', error: 'Missing or malformed Authorization header' });
    return null;
  }

  const token = authHeader.split(' ')[1];

  if(!token){
    res.status(401).json({ status: 'error', error: 'Token must follow Bearer scheme: "Bearer <token>' });
    return null;
  }

  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256']})

  } catch {
    res.status(401).json({ status: 'error', error: 'Invalid or expired token'});
    return null;
  }
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const decoded = extractToken(req, res);
    if(decoded === null) return;

    if (
        typeof decoded !== 'object' ||
        !('ownerId' in decoded) ||
        !('studioId' in decoded)
    ) {
        res.status(401).json({ status: 'error', error: 'Invalid token payload' });
        return;
    }

    req.user = decoded as JwtPayload;
    next();
  } catch (err) {
    res.status(401).json({ status: 'error', error: 'Invalid or expired token' });
  }
}


export function verifyAdmin(
  req: AdminRequest,
  res: Response,
  next: NextFunction
): void {

  try {
    const decoded = extractToken(req, res);
    if(decoded === null) return;

    if (
        typeof decoded !== 'object' ||
        !('admin' in decoded) ||
        decoded['admin'] !== true
    ) {
        res.status(403).json({ status: 'error', error: 'Admin access required' });
        return;
    }

    req.admin = decoded as JwtAdminPayload;
    next();
    
  } catch (err) {
    res.status(401).json({ status: 'error', error: 'Invalid or expired token' });
  }
}