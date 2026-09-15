import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from './auth.middleware.js';

const JWT_SECRET = process.env.JWT_SECRET as string;

type AuthenticatedAs = 'user' | 'owner';

export interface ReservationAuthRequest extends Request {
  authenticatedAs?: AuthenticatedAs;
  user?: JwtPayload;       // populated when authenticated as studio owner
  reservationId?: string;  // populated for both paths, mirrors req.params.id
}

export function authenticateReservation(
  req: ReservationAuthRequest,
  res: Response,
  next: NextFunction
): void {
  const reservationId = req.params.id;

  if (!reservationId || typeof reservationId !== 'string') {
    res.status(400).json({ status: 'error', error: 'Missing reservation ID in request params' });
    return;
  }

  const authHeader = req.headers['authorization'];

  // --- Studio owner path: Bearer token must be present and valid ---
  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ status: 'error', error: 'Malformed Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ status: 'error', error: 'Missing token in Authorization header' });
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('ownerId' in decoded) ||
        !('studioId' in decoded)
      ) {
        res.status(401).json({ status: 'error', error: 'Invalid token payload' });
        return;
      }

      req.user = decoded as JwtPayload;
      req.reservationId = reservationId;
      req.authenticatedAs = 'owner';
      next();
      return;
    } catch {
      res.status(401).json({ status: 'error', error: 'Invalid or expired token' });
      return;
    }
  }

  req.reservationId = reservationId;
  req.authenticatedAs = 'user';
  next();
}