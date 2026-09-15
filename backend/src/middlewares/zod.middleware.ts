import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import type{ ZodSchema } from "zod";

type ValidationTarget = "body" | "query" | "params";

interface ValidationOptions {
  target?: ValidationTarget;
  stripUnknown?: boolean;
  abortEarly?: boolean;
}
 
interface ValidationErrorResponse {
  status: "error";
  message: string;
  errors: ReturnType<ZodError["flatten"]> | { message: string };
}

export const validate =
  (schema: ZodSchema, options: ValidationOptions = {}) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const {
      target = "body",
      stripUnknown = true,
      abortEarly = false,
    } = options;
 
    try {
      assertParseable(req[target], target);
    } catch (err) {
      const response: ValidationErrorResponse = {
        status: "error",
        message: (err as TypeError).message,
        errors: { message: (err as TypeError).message },
      };
      res.status(400).json(response);
      return;
    }
 
    const effectiveSchema = stripUnknown
      ? (schema as ZodSchema & { strip?: () => ZodSchema }).strip?.() ?? schema
      : schema;

    const result = effectiveSchema.safeParse(req[target]);
 
    if (!result.success) {
      const response: ValidationErrorResponse = {
        status: "error",
        message: "Validation failed",
        errors: buildErrorResponse(result.error, abortEarly),
      };
      res.status(400).json(response);
      return;
    }
    
    req[target] = result.data;
 
    next();
  };


function assertParseable(value: unknown, target: ValidationTarget): void {
  if (target === "body" && (value === null || typeof value !== "object" || Array.isArray(value))) {
    throw new TypeError(`Request ${target} must be a JSON object.`);
  }
}

function buildErrorResponse(
  error: ZodError,
  abortEarly: boolean,
): ValidationErrorResponse["errors"] {
  if (abortEarly) {
    const first = error.issues[0]!;
    return {
      message: `${first.path.join(".") || "value"}: ${first.message}`,
    };
  }
  return error.flatten();
}

export const validateBody = (schema: ZodSchema, opts?: Omit<ValidationOptions, "target">) => 
    validate(schema, { ...opts, target: "body"})

export const validateQuery = (schema: ZodSchema, opts?: Omit<ValidationOptions, "target">) =>
    validate(schema, { ...opts, target: "query" });
 
export const validateParams = (schema: ZodSchema, opts?: Omit<ValidationOptions, "target">) =>
    validate(schema, { ...opts, target: "params" });