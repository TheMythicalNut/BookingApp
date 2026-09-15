
import type { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if(res.headersSent){
    _next(err);
    return;
  }

  const status = typeof err.status === 'number' && err.status >= 400 && err.status < 600
    ? err.status
    : 500;

  const isOperational = err.isOperational === true;
  const clientMessage = isOperational ? err.message : "Internal Server Error";

  if(status >= 500){
    console.error(err);
  } else {
    console.warn(`[${status}] ${err.message}`);
  }

  res.status(status).json({ status: 'error', error: clientMessage, ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
};