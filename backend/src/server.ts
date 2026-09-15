import app from "./app.js";
import { startReservationExpirationJob } from "./jobs/reservationExpirationJob.js";

const parsed = parseInt(process.env.PORT ?? "", 10);
const PORT = Number.isNaN(parsed) ? 3000 : parsed;

const task = startReservationExpirationJob();

const server = app.listen(PORT, () => {
  console.log({ message: "Server running", port: PORT });
}).on("error", (err: NodeJS.ErrnoException) => {
  console.error({ message: "Failed to start server", error: err.message, code: err.code });
  process.exit(1);
});

const shutdown = (signal: string) => {
  console.log({ message: "Shutdown signal received", signal });
 
  task.stop();
 
  server.close(() => {
    console.log({ message: "Server closed" });
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));