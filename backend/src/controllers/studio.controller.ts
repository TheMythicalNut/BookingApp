import * as service from "../services/studio.service.js";
import * as availability from "../services/availability.service.js"
import type { Request, Response, NextFunction } from "express";

export const getStudiosByOptions = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studios = await service.getStudiosByOptions(req.body.options);

    if(!studios.length){
        res.status(200).json([]);
        //res.status(400).json({ error: "Missing or invalid studios entry" });
        return;
    }
    const studiosWithAvail = await Promise.all(
        studios.map(async (studio) => {
            const avail = await availability.getStudioAvailDefaultOptions(studio);
            return { ...studio, available: avail };
        })
    );

    res.json(studiosWithAvail);
  } catch (err) {
    next(err);
  }
};
export const getStudiosByIds = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
    try{
        if (!req.body.ids || !Array.isArray(req.body.ids)) {
            res.status(400).json({ error: "Missing or invalid ids in request body" });
            return;
        }
        const studios = await service.getStudiosByIds(req.body.ids);

        if(!studios.length){
            res.status(200).json([]);
            //res.status(400).json({ error: "Missing or invalid studios entry" });
            return;
        }
        const studiosWithAvail = await Promise.all(
            studios.map(async (studio) => {
                const avail = await availability.getStudioAvailDefaultOptions(studio);
                return { ...studio, available: avail };
            })
        );


        res.json(studiosWithAvail);
    } catch (err) {
        next(err);
    }
};
export const getStudioById = async (
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
        const studio = await service.getStudioById(id as string);

        if(!studio){
            res.status(400).json({ error: "Missing or invalid studio entry" });
            return;
        }
        const avail = await availability.getStudioAvailDefaultOptions(studio)
        studio.available = avail;

        res.json(studio);
    }
    catch (err) {
        next(err);
    }
}

export const getStudioByOwners = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const ids = req.body.ids;

        if (!req.body.ids || !Array.isArray(req.body.ids)) {
            res.status(400).json({ error: "Missing or invalid ids in request body" });
            return;
        }
        const studios = await service.getStudioByOwners(ids);
        
        if(!studios.length){
            res.status(200).json([]);
            //res.status(400).json({ error: "Missing or invalid studios entry" });
            return;
        }
        const studiosWithAvail = await Promise.all(
            studios.map(async (studio) => {
                const avail = await availability.getStudioAvailDefaultOptions(studio);
                return { ...studio, available: avail };
            })
        );


        res.json(studiosWithAvail);
    }
    catch (err) {
        next(err);
    }
} 

export const getStudioByLink = async (
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
        const studio = await service.getStudioByLink(link as string);
        
        if(!studio){
            res.status(400).json({ error: "Missing or invalid studio entry" });
            return;
        }
        const avail = await availability.getStudioAvailDefaultOptions(studio)
        studio.available = avail;

        res.json(studio);
    }
    catch (err) {
        next(err);
    }
}