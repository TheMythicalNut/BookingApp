import { z } from "zod";

const UUID = z
.string()
.refine((val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val), {
  message: "Invalid UUID format",
});

const UUIDArray = z
  .array(UUID, { error: "IDs are required" })
  .min(1, "At least one ID is required");

  
const TimeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Time must be in HH:MM format (e.g. '09:00')");

const DateString = z
  .string()
  .refine(
    (val) => !isNaN(new Date(val).getTime()),
    "Date must be a valid date string (e.g., '2025-06-01', '2025-06-01T14:30:00Z', or other ISO 8601 formats)",
  )
  .refine(
    (val) => {
      const date = new Date(val);
      // Ensure it's not a very far future/past date that JS accepts but is unreasonable
      return date.getFullYear() >= 1000 && date.getFullYear() <= 9999;
    },
    "Date year must be between 1000 and 9999",
  );

export const LoginSchema = z.object({
  email: z
    .email("Must be a valid email address")
    .max(254, "Email must not exceed 254 characters"), // RFC 5321 max
 
  password: z
    .string({ error: "Password is required" })
    .min(12, "Password must be at least 12 characters")
    .max(48, "Password must not exceed 48 characters"),
});

export const SendQuestionSchema = z.object({
  email: z
    .email("Must be a valid email address")
    .max(254, "Email must not exceed 254 characters"),
 
  message: z
    .string({ error: "Message is required" })
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(255, "Message must not exceed 255 characters"),
});

export const StudioOptionsSchema = z.object({
  search: z
    .string()
    .trim()
    .max(100, "Search term must not exceed 100 characters")
    .optional(),
 
  studioType: z
    .string()
    .trim()
    .max(50, "Studio type must not exceed 50 characters")
    .optional(),
 
  amount: z
    .number({ error: "Amount must be a number" })
    .int("Amount must be an integer")
    .positive("Amount must be a positive number")
    .max(200, "Amount must not exceed 200")
    .optional(),
 
  include: z
    .array(UUID, { error: "include is required" })
    .max(50, "include must not contain more than 50 IDs")
    .default([]),
 
  exclude: z
    .array(UUID, { error: "exclude is required" })
    .max(500, "exclude must not contain more than 50 IDs")
    .default([]),
})
.refine(
  (data) => {
    const includeSet = new Set(data.include);
    return !data.exclude.some((id) => includeSet.has(id));
  },
  { message: "include and exclude lists must not share any IDs" },
);

export const GetStudiosByOptionsSchema = z.object({
  options: StudioOptionsSchema,
});

export const GetStudiosByIdsSchema = z.object({
  ids: UUIDArray.max(100, "Cannot request more than 100 studios at once"),
});

export const GetStudioByIdSchema = z.object({
  id: UUID,
});

export const GetStudiosByOwnersSchema = z.object({
  ids: UUIDArray.max(100, "Cannot request more than 100 studios at once"),
});

export const GetStudioByLinkSchema = z.object({
  link: z
    .string({ error: "Link is required" })
    .trim()
    .min(1, "Link must not be empty")
    .max(100, "Link must not exceed 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Link must be a valid slug (lowercase letters, numbers, and hyphens only)",
    ),
});


export const LocationSchema = z.object({
  city: z
    .string({ error: "City is required" })
    .trim()
    .min(1, "City must not be empty")
    .max(100, "City must not exceed 100 characters"),
 
  country: z
    .string({ error: "Country is required" })
    .trim()
    .min(1, "Country must not be empty")
    .max(100, "Country must not exceed 100 characters"),
 
  latitude: z
    .number("Latitude is required")
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
 
  longitude: z
    .number("Longitude is required")
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

 
export const TimerangeSchema = z
  .object({
    startDate: DateString,
    endDate: DateString,
    start: TimeString,
    end: TimeString,
  })
  .refine(
    (data) => data.endDate >= data.startDate,
    { message: "endDate must be on or after startDate", path: ["endDate"] },
  )
  .refine(
    (data) => {
      if (data.startDate !== data.endDate) return true;
      return data.start < data.end;
    },
    { message: "end time must be after start time on the same day", path: ["end"] },
  );


export const ServiceOptionsSchema = z
  .object({
    location: LocationSchema.optional(),
    timeslot: TimerangeSchema.optional(),

    serviceType: z
      .string()
      .trim()
      .min(1, "serviceType must not be empty")
      .max(50, "serviceType must not exceed 50 characters")
      .optional(),

    amount: z
      .number({ error: "amount must be a number" })
      .int("amount must be an integer")
      .positive("amount must be a positive number")
      .max(200, "amount must not exceed 200")
      .optional(),

    include: z
      .array(UUID, { error: "include is required" })
      .max(50, "include must not contain more than 50 IDs")
      .default([]),

    exclude: z
      .array(UUID, { error: "exclude is required" })
      .max(50, "exclude must not contain more than 50 IDs")
      .default([]),
  })
  .refine(
    (data) => {
      const includeSet = new Set(data.include);
      return !data.exclude.some((id) => includeSet.has(id));
    },
    { message: "include and exclude lists must not share any IDs" },
  );

export const GetServicesByOptionsSchema = z.object({
  options: ServiceOptionsSchema,
});

export const GetServicesByIdsSchema = z.object({
  ids: UUIDArray.max(100, "Cannot request more than 100 services at once"),
});

export const GetServiceByIdSchema = z.object({
  id: UUID,
});

export const GetServiceByLinkSchema = z.object({
  link: z
    .string({ error: "Link is required" })
    .trim()
    .min(1, "Link must not be empty")
    .max(100, "Link must not exceed 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Link must be a valid slug (lowercase letters, numbers, and hyphens only)",
    ),
});

export const PackageOptionsSchema = z
  .object({
    location: LocationSchema.optional(),
 
    timeslot: TimerangeSchema.optional(),
 
    serviceType: z
      .string()
      .trim()
      .min(1, "serviceType must not be empty")
      .max(50, "serviceType must not exceed 50 characters")
      .optional(),
 
    amount: z
      .number({ error: "amount must be a number" })
      .int("amount must be an integer")
      .positive("amount must be a positive number")
      .max(200, "amount must not exceed 200")
      .optional(),
 
    include: z
      .array(UUID, { error: "include is required" })
      .max(50, "include must not contain more than 50 IDs")
      .default([]),
 
    exclude: z
      .array(UUID, { error: "exclude is required" })
      .max(50, "exclude must not contain more than 50 IDs")
      .default([]),
  })
  .refine(
    (data) => {
      const includeSet = new Set(data.include);
      return !data.exclude.some((id) => includeSet.has(id));
    },
    { message: "include and exclude lists must not share any IDs" },
  );

export const GetPackagesByOptionsSchema = z.object({
  options: PackageOptionsSchema,
});

export const GetPackagesByIdsSchema = z.object({
  ids: UUIDArray.max(100, "Cannot request more than 100 packages at once"),
});

export const GetPackageByIdSchema = z.object({
  id: UUID,
});

export const GetPackageByLinkSchema = z.object({
  link: z
    .string({ error: "Link is required" })
    .trim()
    .min(1, "Link must not be empty")
    .max(100, "Link must not exceed 100 characters")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Link must be a valid slug (lowercase letters, numbers, and hyphens only)",
    ),
});

export const OwnerOptionsSchema = z
  .object({
    studio:      UUID.optional(),
    service:     UUID.optional(),
    package:     UUID.optional(),
    reservation: UUID.optional(),
    owner:       UUID.optional(),
    location:    LocationSchema.optional(),
 
    token: z
      .string()
      .trim()
      .min(1, "token must not be empty")
      .max(512, "token must not exceed 512 characters")
      .optional(),
  })
  // At least one filter must be provided — an empty options object is useless
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    { message: "At least one filter must be provided in options" },
  );

export const GetOwnersByOptionsSchema = z.object({
  options: OwnerOptionsSchema,
});

export const GetOwnersByIdsSchema = z.object({
  ids: UUIDArray.max(100, "Cannot request more than 100 owners at once"),
});

export const GetOwnerByIdSchema = z.object({
  id: UUID,
});