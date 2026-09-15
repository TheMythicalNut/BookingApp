import * as service from "../services/user.service.js";

import type { Request, Response, NextFunction } from "express";

export const getUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await service.getAllUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
};
