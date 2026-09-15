import * as cron from "node-cron";
import * as reservationService from "../services/reservations.service.js";

export const startReservationExpirationJob = (): cron.ScheduledTask => {
  let isRunning = false;
  const task = cron.schedule("*/5 * * * *", async () => {
    if(isRunning) return;
    isRunning = true;
    try {
      const expired = await reservationService.expireUnconfirmedReservations();

      console.debug('Reservation expiration job ran');
      if (expired > 0) { 
        console.log({ job: "reservationExpiration", message: `Expired ${expired} reservations` }); 
      }
    } catch (err) {
      console.error({
        job: "reservationExpiration",
        message: "Reservation expiration job failed",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      isRunning = false;
    }
  });

  process.on("SIGTERM", () => task.stop());
  process.on("SIGINT", () => task.stop());

  return task;
};