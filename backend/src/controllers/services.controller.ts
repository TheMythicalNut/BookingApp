import * as service from "../services/services.service.js";

import type { Request, Response, NextFunction } from "express";

export const getServicesByOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const services = await service.getServicesByOptions(req.body.options);
    res.json(services);
  } catch (err) {
    next(err);
  }
};
export const getServicesByIds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    try{
        if (!req.body.ids || !Array.isArray(req.body.ids)) {
            res.status(400).json({ error: "Missing or invalid ids in request body" });
            return;
        }
        const services = await service.getServicesByIds(req.body.ids);
        res.json(services);
    } catch (err) {
        next(err);
    }
};
export const getServicesById = async (
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
        const serviceItem = await service.getServiceById(id as string);
        res.json(serviceItem);
    }
    catch (err) {
        next(err);
    }
}
export const getServicesByLink = async (
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
        const serviceItem = await service.getServiceByLink(link as string);
        res.json(serviceItem);
    }
    catch (err) {
        next(err);
    }
}