import * as service from "../services/owner.service.js";

import type { Request, Response, NextFunction } from "express";

export const getOwnersByOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const owners = await service.getOwnersByOptions(req.body.options);
    res.json(owners);
  } catch (err) {
    next(err);
  }
};
export const getOwnersByIds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    try{
        if (!req.body.ids || !Array.isArray(req.body.ids)) {
            res.status(400).json({ error: "Missing or invalid ids in request body" });
            return;
        }
        const owners = await service.getOwnersByIds(req.body.ids);
        res.json(owners);
    } catch (err) {
        next(err);
    }
};
export const getOwnerById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    try{
        const id = req.params.id;
        if(!id || typeof id !== "string"){
            res.status(400).json({ error: "Missing id parameter" });
            return;
        }
        const owner = await service.getOwnerById(id as string);
        res.json(owner);
    }
    catch (err) {
        next(err);
    }
}