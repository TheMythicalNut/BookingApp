import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { findOwnerByEmailAndPassword } from "../services/owner.service.js";
import { createAdminSession, createSession } from "../services/sessions.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";

if (!process.env.JWT_SECRET) {
  throw new Error("Missing required environment variables: JWT_SECRET");
}
if (!process.env.ADMIN_PASSWORD){
  throw new Error("Missing required environment variables: ADMIN_PASSWORD");
}

const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const SESSION_DURATION_HOURS = 12;

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ status: "error", message: "Email and password are required" });
      return;
    }

    const owner = await findOwnerByEmailAndPassword(email, password);

    if (!owner) {
      res.status(401).json({ status: "error", message: "Invalid credentials" });
      return;
    }

    // Build JWT (12h expiry)
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    const token = jwt.sign(
      { ownerId: owner.id, studioId: owner.studio },
      JWT_SECRET,
      { expiresIn: "12h" }
    );

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Persist session in DB
    await createSession({
      ownerId: owner.id,
      token: tokenHash,
      expiresAt,
    });

    const loginData = {
      token,
      owner: owner.id, // owner FK
    };

    res.status(200).json({ status: "success", data: loginData });
  } catch (err) {
    next(err);
  }
};

export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { password } = req.body;

    if (!password) {
      res.status(400).json({ status: "error", message: "password required" });
      return;
    }

    const isValid = await bcrypt.compare(password, ADMIN_PASSWORD);
    if(!isValid){
      res.status(400).json({ status: "error", message: "password invalid" });
      return;
    }

    // Build JWT (12h expiry)
    const expiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000);

    const token = jwt.sign(
      { admin: true },
      JWT_SECRET,
      { expiresIn: "12h" }
    );
    
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Persist session in DB
    await createAdminSession({ token: tokenHash, expiresAt });

    res.status(200).json({ status: "success", data: token });
  } catch (err) {
    next(err);
  }
};