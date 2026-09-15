import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { errorHandler } from "./middlewares/error.middleware.js";

import type { Application } from "express";
import { login } from "./controllers/login.controller.js";
import { sendQuestion } from "./controllers/question.controller.js";
import { verifyAuth } from "./controllers/auth.controller.js";
import { getPool } from "./config/db.js";
import { hash } from "bcrypt";

import pg from 'pg';
import { validateBody } from "./middlewares/zod.middleware.js";
import { LoginSchema, SendQuestionSchema } from "./config/route.zod.schemas.js";

import { corsOptions } from "./config/cors.js";
import { authLimiter, globalLimiter, questionLimiter, userLimiter } from "./config/redis-limiter.js";

pg.types.setTypeParser(pg.types.builtins.DATE, (val: string) => val);
pg.types.setTypeParser(pg.types.builtins.TIME, (val: string) => val.slice(0, 5));

const app: Application = express();

app.set("trust proxy", 1);
app.use(helmet());
app.use(cors(corsOptions));
app.use(globalLimiter);
app.use(express.json());
app.use(morgan("dev"));

// TESTING
const pass_hash = await hash("Testpass#123", 10);
const test_query = `
UPDATE owners
SET password_hash = ($1), email = ($2), setup_state = ($3)
WHERE id = ($4::uuid)
` 
getPool().query(test_query, [pass_hash, "test_user@email.com", "COMPLETED", "30000000-0000-0000-0000-000000000001"])

const tables = ["studio_services", "studio_packages"];
const lorem = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

tables.forEach(async (table) => {
  if (!["studio_services", "studio_packages"].includes(table)) return;
  const query = `UPDATE ${table} SET description = $1`;
  await getPool().query(query, [lorem]);
});
// TESTING

app.get("/health", (_req, res) => { res.status(200).json({ status: "ok" }); });
app.use("/users", (await import("./routes/user.routes.js")).default);
app.use("/studios", (await import("./routes/studio.routes.js")).default);
app.use("/services", (await import("./routes/services.routes.js")).default);
app.use("/packages", (await import("./routes/packages.routes.js")).default);
app.use("/owners", (await import("./routes/owner.routes.js")).default);
app.use("/reservations", (await import("./routes/reservations.routes.js")).default);
app.use("/admin", (await import("./routes/admin.routes.js")).default);
app.use("/set", userLimiter, (await import("./routes/resource.routes.js")).default);

app.post("/login", authLimiter, validateBody(LoginSchema), login);
app.post("/question/send", questionLimiter, validateBody(SendQuestionSchema), sendQuestion);
app.get("/authvalidate", authLimiter, verifyAuth);

app.use(errorHandler);

export default app;