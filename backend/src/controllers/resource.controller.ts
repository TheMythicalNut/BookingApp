import type { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { updateCategoriesForStudio, updateDiscountsForStudio, updatePackagesForStudio, updateResourceById, updateServicesForStudio } from '../services/resource.service.js';
import type { CategoryDiff, DiscountsDiff } from '../types/studio.js';
import { updateExceptionsForStudio } from '../services/exception.service.js';
import type { ExceptionDiff } from '../types/exception.js';
import type { ScheduleDiff } from '../types/schedule.js';
import { updateSchedulesForStudio } from '../services/schedule.service.js';
import type { PackageDiff } from '../types/packages.js';
import type { ServiceDiff } from '../types/services.js';

type OwnershipSource = 'studioId' | 'ownerId';

const RESOURCE_CONFIG = {
  studio:      { bodyKey: 'studio',      ownershipField: 'id',       ownershipSource: 'studioId'  },
  owner:       { bodyKey: 'owner',       ownershipField: 'id',       ownershipSource: 'ownerId'   },
  reservation: { bodyKey: 'reservation', ownershipField: 'studioId', ownershipSource: 'studioId'  },
  package:     { bodyKey: 'package',     ownershipField: 'studioId', ownershipSource: 'studioId'  },
  service:     { bodyKey: 'service',     ownershipField: 'studioId', ownershipSource: 'studioId'  },
} as const;

type ResourceKey = keyof typeof RESOURCE_CONFIG;

export function updateResource(resource: ResourceKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { bodyKey, ownershipField, ownershipSource } = RESOURCE_CONFIG[resource];
      const payload = req.body[bodyKey] as Record<string, unknown> | undefined;

      if (!payload || typeof payload.id !== 'string') {
        res.status(400).json({ message: `Missing or invalid "${bodyKey}.id" in request body` });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const payloadOwnershipValue = payload[ownershipField];
      const tokenOwnershipValue   = req.user[ownershipSource as OwnershipSource];

      if (payloadOwnershipValue !== tokenOwnershipValue) {
        res.status(403).json({ message: 'Forbidden: resource does not belong to this owner' });
        return;
      }

      const updateFields = Object.keys(payload).filter(k => k !== 'id');
      if (updateFields.length === 0) {
        res.status(400).json({ message: 'No fields to update' });
        return;
      }

      const updated = await updateResourceById(resource, payload.id, payload);

      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  };
}

type DiffHandler = (
  studioId: string,
  diff:     unknown,
  files?:   Express.Multer.File[]
) => Promise<unknown>;

const MANY_CONFIG: Record<string, { bodyKey: string; handler: DiffHandler }> = {
  
  categories: { bodyKey: 'diff', handler: (studioId, diff) => updateCategoriesForStudio(studioId, diff as CategoryDiff) },
  packages:   { bodyKey: 'diff', handler: (studioId, diff) => updatePackagesForStudio(studioId,   diff as PackageDiff)   },
  services:   { bodyKey: 'diff', handler: (studioId, diff, files) => updateServicesForStudio(studioId,   diff as ServiceDiff, files ?? []) },
  exceptions: { bodyKey: 'diff', handler: (studioId, diff) => updateExceptionsForStudio(studioId, diff as ExceptionDiff) },
  schedules:  { bodyKey: 'diff', handler: (studioId, diff) => updateSchedulesForStudio(studioId, diff as ScheduleDiff) },
  discounts:  { bodyKey: 'diff', handler: (studioId, diff) => updateDiscountsForStudio(studioId, diff as DiscountsDiff)}
};

export type ManyKey = keyof typeof MANY_CONFIG;

// In resource.controller.ts
export function updateMany(many: ManyKey) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const config = MANY_CONFIG[many];
      if (!config) {
        res.status(400).json({ message: `Unknown resource: ${many}` });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const studioId = req.user.studioId;
      const raw  = req.body[config.bodyKey];
      const diff = typeof raw === 'string' ? JSON.parse(raw) : raw;
      
      if (!diff) {
        res.status(400).json({ message: `Missing "${config.bodyKey}" in request body` });
        return;
      }

      // Pass files alongside diff for services
      const files = Array.isArray(req.files) ? req.files : [];
      const result = await config.handler(studioId, diff, files);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  };
}

