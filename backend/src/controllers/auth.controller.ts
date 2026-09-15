// controllers/auth.controller.ts

import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { findAdminSessionByToken, findSessionByToken } from "../services/sessions.service.js";

const JWT_SECRET = process.env.JWT_SECRET as string;

export const verifyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;


    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    const session = await findSessionByToken(token);

    if (!session || new Date(session.expires_at) < new Date()) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    res.status(200).json({ status: "success", data: true });
  } catch (err) {
    next(err);
  }
};

export const verifyAdminAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    if (payload.exp && payload.exp * 1000 < Date.now()) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    const session = await findAdminSessionByToken(token);

    if (!session || new Date(session.expires_at) < new Date()) {
      res.status(200).json({ status: "success", data: false });
      return;
    }

    res.status(200).json({ status: "success", data: true });
  } catch (err) {
    next(err);
  }
};