import type { Request, Response, NextFunction } from "express";
import * as service from "../services/reservations.service.js";
import * as studioService from "../services/studio.service.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import type { ReservationAuthRequest } from "../middlewares/resauth.middleware.js";
import type { Reservation, Timeslot } from "../types/reservation.js";
import { getStudioAvailDefaultOptions } from "../services/availability.service.js";
import type { Available } from "../types/studio.js";
import { MAX_TERM_CHANGE_COUNT } from "../config/CONST.js";

// GET /api/reservations/:id
export const getUserReservationById = async (
  req: ReservationAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id;
    if(!id || typeof id !== "string"){
        res.status(400).json({ error: "Missing id parameter" });
        return;
    }
    const reservation = await service.getUserReservationById(id);
    res.json(reservation);
  } catch (err) {
    next(err);
  }
};

// POST /api/reservations/studio
export const getStudioReservationsById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.user?.studioId;
    if(!id || typeof id !== "string"){
        res.status(400).json({ error: "Missing id parameter" });
        return;
    }

    const reservations = await service.getStudioReservationsById(id);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
};

// POST /api/reservations  →  { options: LoadReservationOptions }
export const getReservationsByOptions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reservations = await service.getReservationsByOptions(req.body.options);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
};

// POST /api/reservations/ids/  →  { ids: string[] }
export const getReservationsByIds = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.body.ids || !Array.isArray(req.body.ids)) {
        res.status(400).json({ error: "Missing or invalid ids in request body" });
        return;
    }

    const reservations = await service.getReservationsByIds(req.body.ids);
    res.json(reservations);
  } catch (err) {
    next(err);
  }
};


// POST /api/set/reservations/create
export const createReservation = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {

    if(!req.body.reservation) {  
      res.status(400).json({ status: 'error', error: 'Missing or invalid reservation' });
      return;
    }

    const { userEmail, userPhone, studio, timeslot, duration } = req.body.reservation;

    if (!userEmail || typeof userEmail !== 'string') {
      res.status(400).json({ status: 'error', error: 'Missing or invalid userEmail' });
      return;
    }
    if (!userPhone || typeof userPhone !== 'string') {
      res.status(400).json({ status: 'error', error: 'Missing or invalid userPhone' });
      return;
    }
    if (!studio || typeof studio !== 'string') {
      res.status(400).json({ status: 'error', error: 'Missing or invalid studio' });
      return;
    }
    if (!timeslot?.date || !timeslot?.start) {
      res.status(400).json({ status: 'error', error: 'Missing or invalid timeslot' });
      return;
    }
    if (!duration || typeof duration !== 'number' || duration <= 0) {
      res.status(400).json({ status: 'error', error: 'Missing or invalid duration' });
      return;
    }

    const fullStudio = await studioService.getStudioById(studio);
    if (!fullStudio){
      res.status(400).json({ status: 'error', error: 'Missing or invalid studio' });
      return;
    }

    const avail = await getStudioAvailDefaultOptions(fullStudio);

    if (!isTimeslotAvailable(avail, timeslot, duration)) {
      res.status(409).json({ status: 'error', error: 'Timeslot is not available', body: avail });
      return;
    }

    const reservation = await service.createReservation(req.body.reservation);

    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
};

function isTimeslotAvailable(
  avail: Available[],
  timeslot: Timeslot,
  duration: number
): boolean {
  const day = avail.find(a => a.date === timeslot.date);
  if (!day) return false;

  const [startHour, startMin] = timeslot.start.split(":").map(Number);
  if(startHour === undefined || startMin === undefined) return false;
  const requestStart = startHour * 60 + startMin;
  const requestEnd   = requestStart + duration;

  return day.intervals.some(interval => {
    const [iStartHour, iStartMin] = interval.start.split(":").map(Number);
    const [iEndHour,   iEndMin  ] = interval.end.split(":").map(Number);
    
    if(iStartHour === undefined || iStartMin === undefined ||  iEndHour === undefined || iEndMin === undefined) return false;
    const intervalStart = iStartHour * 60 + iStartMin;
    const intervalEnd   = iEndHour   * 60 + iEndMin;

    return requestStart >= intervalStart && requestEnd <= intervalEnd;
  });
}

// POST /api/reservations/resend/:id
export const resendEmailById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = req.params.id;
    if(!id || typeof id !== "string"){
        res.status(400).json({ error: "Missing id parameter" });
        return;
    }
    
    await service.resendEmailById(id);
    
    res.status(200).json({success: true});
  } catch (err) {
    next(err);
  }
}

type Actor = "USER" | "OWNER";

const IMMUTABLE_FIELDS = [
  "studioName",
  "categoryName",
  "articleName",
  "articleType",
  "userEmail",
  "userPhone",
  "price",
  "currency",
  "discount",
  "duration",
  "contactPhone",
  "additionalNote",
  "country",
  "city",
  "address",
  "latitude",
  "longitude",
  "timeZone",
  "termChangeCount",
  "timestamp",
  "user",
  "studio",
  "service",
  "package",
  "addons",
  "id",
] as const;

// POST /api/set/reservations/update/:id
export const updateReservation = async (
  req: ReservationAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.reservationId) {
      res.status(400).json({ error: "Missing reservation id" });
      return;
    }

    const reservationId = req.reservationId;
    const payload: Partial<Reservation> = req.body?.reservation ?? {};

    const actor = determineActor(req);

    const preupdate = await service.getUserReservationById(reservationId);

    validateUserReservationAccess(req, reservationId, preupdate.studio);

    // remove id from payload before validation
    if ("id" in payload) {
      delete (payload as any).id;
    }

    rejectImmutableFields(payload);

    const sanitized = filterAllowedReservationFields(payload, actor);

    if (Object.keys(sanitized).length === 0) {
      res.status(400).json({
        error: "No valid fields provided for update",
      });
      return;
    }


    if(sanitized.timeslot !== undefined){

      if(actor === 'USER' && preupdate.termChangeCount >= MAX_TERM_CHANGE_COUNT){
        res.status(400).json({status: 'error', error: 'Max term change count exceeded'});
        return;
      }

      const fullStudio = await studioService.getStudioById(preupdate.studio);
      if (!fullStudio){
        res.status(400).json({ status: 'error', error: 'Missing or invalid studio' });
        return;
      }

      const avail = await getStudioAvailDefaultOptions(fullStudio);

      if (!isTimeslotAvailable(avail, sanitized.timeslot, preupdate.duration)) {
        console.log(avail, sanitized.timeslot, preupdate.duration);

        res.status(409).json({ status: 'error', error: 'Timeslot is not available', errorBody: avail });
        return;
      }

      if(actor === 'USER') 
        sanitized.termChangeCount = preupdate.termChangeCount + 1;
    }

    const input: service.UpdateReservationInput = {
      id: reservationId,
      ...sanitized,
    };

    const reservation = await service.updateReservation(input);

    res.json(reservation);
  } catch (err) {
    next(err);
  }
};

// HELPER
function determineActor(req: ReservationAuthRequest): Actor {
  if (!req.authenticatedAs) {
    throw new Error("Missing authentication context");
  }

  return req.authenticatedAs === "user" ? "USER" : "OWNER";
}

function validateUserReservationAccess(
  req: ReservationAuthRequest,
  reservationId: string,
  studioId: string
) {
  if (req.authenticatedAs === "user") {
    if (req.reservationId !== reservationId) {
      const err: any = new Error("User cannot modify this reservation");
      err.status = 403;
      throw err;
    }
  }

  if(req.authenticatedAs === 'owner' && req.user!.studioId !== studioId){
    const err: any = new Error("Reservation does not belong to this studio owner");
    err.status = 403;
    throw err;
  }
}

function rejectImmutableFields(payload: Partial<Reservation>) {
  for (const field of IMMUTABLE_FIELDS) {
    if (field in payload) {
      const err: any = new Error(`Field "${field}" cannot be modified`);
      err.status = 400;
      throw err;
    }
  }
}

function filterAllowedReservationFields(
  payload: Partial<Reservation>,
  actor: Actor
): Partial<Reservation> {
  const result: Partial<Reservation> = {};

  if (actor === "USER") {
    if (payload.timeslot !== undefined) {
      result.timeslot = payload.timeslot;
    }

    if (payload.status !== undefined) {
      if (payload.status.status !== "USER_CANCELLED" && payload.status.status !== "CONFIRMED" ) {
        const err: any = new Error(
          "Users may only change status to USER_CANCELLED or CONFIRMED"
        );
        err.status = 403;
        throw err;
      }

      result.status = payload.status;
    }

    if (payload.rating !== undefined) {
      if(payload.rating.rating > 0  && payload.rating.rating <= 5){
        result.rating = {
          rating: payload.rating.rating,
          ...(!!payload.rating.comment && { comment: payload.rating.comment }),
        }
      } else {
        const err: any = new Error(
          "Users cannot rate experiences outside of a 5 point scoring system"
        );
        err.status = 403;
        throw err;
      }
    }
  }

  if (actor === "OWNER") {
    if (payload.timeslot !== undefined) {
      result.timeslot = payload.timeslot;
    }

    if (payload.status !== undefined) {
      if (payload.status.status === "USER_CANCELLED" || payload.status.status === "PENDING_CONFIRMATION") {
        const err: any = new Error(
          "Owners cannot set USER_CANCELLED or PENDING_CONFIRMATION status"
        );
        err.status = 403;
        throw err;
      }

      result.status = payload.status;
    }
  }

  return result;
}