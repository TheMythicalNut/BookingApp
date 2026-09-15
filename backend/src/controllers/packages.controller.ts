import * as service from "../services/packages.service.js";

import type { Request, Response, NextFunction } from "express";

export const getPackagesByOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const packages = await service.getPackagesByOptions(req.body.options);
    res.json(packages);
  } catch (err) {
    next(err);
  }
};
export const getPackagesByIds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    try{
        if (!req.body.ids || !Array.isArray(req.body.ids)) {
            res.status(400).json({ error: "Missing or invalid ids in request body" });
            return;
        }
        const packages = await service.getPackagesByIds(req.body.ids);
        res.json(packages);
    } catch (err) {
        next(err);
    }
};
export const getPackageById = async (
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
        const packageItem = await service.getPackageById(id as string);
        res.json(packageItem);
    }
    catch (err) {
        next(err);
    }
}
export const getPackageByLink = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    try{
        const link = req.params.link;
        if(!link || typeof link !== "string"){
            res.status(400).json({ error: "Missing link parameter" });
            return;
        }
        const packageItem = await service.getPackageByLink(link as string);
        res.json(packageItem);
    }
    catch (err) {
        next(err);
    }
}