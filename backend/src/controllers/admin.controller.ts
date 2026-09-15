// controllers/admin.controller.ts

import type { Request, Response } from "express";
import * as service from "../services/admin.service.js";

const MAX_QUERY_LENGTH = 4096;
const FORBIDDEN_KEYWORDS = [ 'DROP', 'TRUNCATE', 'ALTER', 'GRANT', 'REVOKE', 'CREATE ROLE', 'DROP ROLE' ];

const SPECIAL_COMMANDS = ['CREATE_OWNER'];

export const request = async (
  req: Request,
  res: Response
): Promise<void> => {
  const start = Date.now();

  try {
    const sqlOrCommand = req.body.request;

    if (!sqlOrCommand || typeof sqlOrCommand !== 'string') {
        res.status(400).json({ status: 'error', error: { message: 'SQL must be a non-empty string' } });
        return;
    }

    if (sqlOrCommand.length > MAX_QUERY_LENGTH) {
        res.status(400).json({ status: 'error', error: { message: 'Query exceeds maximum allowed length' } });
        return;
    }


    const commandMatch = sqlOrCommand.match(/^\[(\w+)\]\s*(\{.*\})$/s);
    if (commandMatch && commandMatch[1] && commandMatch[2]) {
      const commandName = commandMatch[1];
      const paramsStr = commandMatch[2];

      if (!SPECIAL_COMMANDS.includes(commandName)) {
        res.status(403).json({ status: 'error', error: { message: `Unknown special command: ${commandName}` } });
        return;
      }

      let params;
      try {
        params = JSON.parse(paramsStr);
      } catch (err) {
        res.status(400).json({ status: 'error', error: { message: 'Invalid JSON parameters for command' } });
        return;
      }

      // Execute the special command
      const result = await executeSpecialCommand(commandName, params);
      res.status(200).json({ status: 'success', data: result, meta: { executionTimeMs: Date.now() - start } });
      return;
    }


    const normalizedSql = sanitizeSql(sqlOrCommand);

    if (!normalizedSql) {
        res.status(400).json({ status: 'error', error: { message: 'SQL is empty after sanitization' } });
        return;
    }

    if (containsForbidden(normalizedSql)) {
      res.status(403).json({ status: 'error', error: { message: 'Forbidden SQL operation detected' } });
      return;
    }

    const executionOptions = { timeoutMs: 5000, maxRows: 1000 };

    const result = await service.executeAdminQuery( normalizedSql, executionOptions );

    res.status(200).json({ status: 'success', data: result, meta: { executionTimeMs: Date.now() - start } });

  } catch (err) {
    console.error('[ADMIN_SQL_CONTROLLER_ERROR]', err);
    res.status(500).json({ status: 'error', error: formatError(err) });
  }
}

function sanitizeSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')  // strip block comments /* ... */
    .replace(/--.*$/gm, '')             // strip line comments --
    .trim();
}

function containsForbidden(sql: string) {
  const upper = sql.replace(/\s+/g, ' ').toUpperCase();
  return FORBIDDEN_KEYWORDS.some(k => upper.includes(k));
}

function formatError(err: any) {
  return {
    message: err.message || 'Execution failed',
    code: err.code || 'INTERNAL_ERROR',
    detail: null
  };
}

async function executeSpecialCommand(command: string, params: any) : Promise<any> {
  switch (command) {
    case 'CREATE_OWNER':

      const requiredFields = [
        'first_name', 'last_name', 'email', 'password',
        'name', 'link', 'country', 'city', 'street',
        'building_number', 'apartment_number', 'latitude',
        'longitude', 'time_zone'
      ];
      const missingFields = requiredFields.filter(f => params[f] === undefined || params[f] === null);

      if (missingFields.length > 0) {
        throw new Error(`Missing required fields for CREATE_OWNER: ${missingFields.join(', ')}`);
      }

      if (typeof params.latitude !== 'number' || typeof params.longitude !== 'number') {
        throw new Error('latitude and longitude must be numbers');
      }

      return await service.createOwner(params);
    default:
      throw new Error(`Unhandled special command: ${command}`);
  }
}