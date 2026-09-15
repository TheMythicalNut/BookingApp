import { AbstractControl, ValidationErrors } from "@angular/forms";

const EMAIL_MIN_LENGTH = 6;
const EMAIL_MAX_LENGTH = 254;
const LOCAL_PART_MAX_LENGTH = 64;

// Allows Unicode letters & numbers if supported by JS engine
const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+$/u;

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') {
    return false;
  }

  const value = email.trim();

  if (
    value.length < EMAIL_MIN_LENGTH ||
    value.length > EMAIL_MAX_LENGTH
  ) {
    return false;
  }

  // Basic structure check
  if (!BASIC_EMAIL_REGEX.test(value)) {
    return false;
  }

  const [local, domain] = value.split('@');

  // Local part length (RFC 5321)
  if (local.length > LOCAL_PART_MAX_LENGTH) {
    return false;
  }

  // No leading, trailing, or consecutive dots
  if (
    local.startsWith('.') ||
    local.endsWith('.') ||
    local.includes('..')
  ) {
    return false;
  }

  // Domain must contain at least one dot (configurable)
  if (!domain.includes('.')) {
    return false;
  }

  const domainLabels = domain.split('.');

  for (const label of domainLabels) {
    if (
      label.length === 0 ||
      label.length > 63 ||
      label.startsWith('-') ||
      label.endsWith('-')
    ) {
      return false;
    }

    // Allow IDN (Unicode) or punycode
    if (!/^[\p{L}\p{N}-]+$/u.test(label)) {
      return false;
    }
  }

  return true;
}


export function emailValidator(
  control: AbstractControl
): ValidationErrors | null {

  const value = control.value;

  if (!value) {
    return null;
  }

  return isValidEmail(value)
    ? null
    : { email: true };
}

const MIN_DIGITS = 9;
const MAX_DIGITS = 15;

const ALLOWED_FORMAT_CHARS = new Set([' ', '-', '.', '(', ')']);

export function isValidPhone(phone: unknown): boolean {
  if (typeof phone !== 'string') {
    return false;
  }

  const input = phone.trim();
  if (input.length === 0) {
    return false;
  }

  if (input[0] !== '+') {
    return false;
  }

  let digits = '';
  let hasPlus = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (char >= '0' && char <= '9') {
      digits += char;
      continue;
    }

    if (char === '+') {
      if (i !== 0 || hasPlus) {
        return false;
      }
      hasPlus = true;
      continue;
    }

    if (ALLOWED_FORMAT_CHARS.has(char)) {
      continue;
    }

    return false;
  }

  if (digits.length === 0) {
    return false;
  }

  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS) {
    return false;
  }

  if (digits[0] === '0') {
    return false;
  }

  if (!areParenthesesBalanced(input)) {
    return false;
  }

  return true;
}
function areParenthesesBalanced(value: string): boolean {
  let balance = 0;

  for (const char of value) {
    if (char === '(') {
      balance++;
    } else if (char === ')') {
      balance--;
      if (balance < 0) {
        return false;
      }
    }
  }

  return balance === 0;
}


export function isValidInstagramLink(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  const input = value.trim();

  /**
   * Regex breakdown:
   * ^                               → start of string
   * (https?:\/\/)?                  → optional http or https protocol
   * (www\.)?                        → optional www
   * instagram\.com\/                → required domain
   * (?!p\/|reel\/|stories\/|explore\/)
   *                                 → disallow non-profile paths
   * ([A-Za-z0-9._]{1,30})           → username (1–30 valid chars)
   * (?<!\.)                         → username cannot end with a dot
   * \/??                            → optional trailing slash
   * $                               → end of string (no query/fragments)
   */
  const instagramProfileRegex =
    /^(https?:\/\/)?(www\.)?instagram\.com\/(?!p\/|reel\/|stories\/|explore\/)([A-Za-z0-9._]{1,30})(?<!\.)\/?$/;

  return instagramProfileRegex.test(input);
}

export function isValidFacebookLink(value: string): boolean {
  if (!value || typeof value !== "string") return false;

  const input = value.trim();

  /**
   * Regex breakdown:
   * ^                               → start of string
   * (https?:\/\/)?                  → optional http or https protocol
   * (www\.)?                        → optional www
   * facebook\.com\/                 → required domain
   * (?!pages\/|groups\/|events\/|marketplace\/)
   *                                 → disallow non-profile paths
   * (
   *   [A-Za-z0-9.]{5,50}            → username (5–50 letters/numbers/dots)
   *   |                             → OR
   *   \d{5,20}                      → numeric profile ID
   * )
   * \/??                            → optional trailing slash
   * $                               → end of string (no query/fragments)
   */
  const facebookProfileRegex =
    /^(https?:\/\/)?(www\.)?facebook\.com\/(?!pages\/|groups\/|events\/|marketplace\/)([A-Za-z0-9.]{5,50}|\d{5,20})\/?$/;

  return facebookProfileRegex.test(input);
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(value);
}

export function hasNoOverlapsIntervals(intervals: { start: string; end: string }[]): boolean {
  const sorted = [...intervals].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) {
      return false;
    }
  }
  return true;
}

export function isValidExceptionType(e: any): boolean {
  return e.type === "oneOff" || e.type === "range" || e.type === "annual";
}

export function isValidAppliesTo(e: any): boolean {
  if (!e || !e.appliesTo) return false;

  switch (e.type) {
    case "oneOff": {
      return isValidISODate(e.appliesTo.date);
    }

    case "range": {
      const { startDate, endDate } = e.appliesTo;

      return (
        isValidISODate(startDate) &&
        isValidISODate(endDate) &&
        startDate <= endDate
      );
    }

    case "annual": {
      const rawMonth = e.appliesTo.month;
      const rawDay = e.appliesTo.day;


      if (
        rawMonth === null || rawMonth === undefined ||
        rawDay === null || rawDay === undefined
      ) {
        return false;
      }

      const month = Number(rawMonth);
      const day = Number(rawDay);

      if (
        !Number.isInteger(month) ||
        !Number.isInteger(day)
      ) {
        return false;
      }

      if (month < 1 || month > 12) return false;

      const maxDays = daysInMonth(2024, month); // 2024 as to include feb. 29 as a possible recurring annual exception, even though it is quadrennial and not annual
      if (day < 1 || day > maxDays) return false;

      return true;
    }

    default:
      return false;
  }
}

export function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
}
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
  // 2024 ensures Feb 29 allowed; adjust if leap-year specificity matters
}

export function hasUniqueArticleTargets(
  discounts: {
    article: { id: string; type: "service" | "package" };
  }[]
): boolean {
  const seen = new Set<string>();

  for (const d of discounts) {
    const key = `${d.article.type}:${d.article.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
  }

  return true;
}

export function hasUniqueStrings(values: string[]): boolean {
  return new Set(values).size === values.length;
}

export function hasUniqueCategoryNames(
  categories: { name: string }[]
): boolean {
  const seen = new Set<string>();

  for (const c of categories) {
    const normalized = c.name.trim().toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
  }

  return true;
}

export function hasUniqueServiceLinks(services: { link: string }[]): boolean {
  const seen = new Set<string>();
  for (const s of services) {
    if (seen.has(s.link)) return false;
    seen.add(s.link);
  }
  return true;
}

export function hasUniquePackageLinks(packages: { link: string }[]): boolean {
  const seen = new Set<string>();
  for (const p of packages) {
    if (seen.has(p.link)) return false;
    seen.add(p.link);
  }
  return true;
}

export function isValidPrice(value: string): boolean {
  if (typeof value !== "string" || isWhitespace(value)) {
    return false;
  }

  // Valid formats:
  // 123
  // 1.234
  // 1,23
  // 12,34
  // 1.234,56
  // 12.345.678,90
  const priceRegex = /^(?:\d{1,3}|\d{1,3}(?:\.\d{3})+)(?:,\d{2})?$/;

  if (!priceRegex.test(value)) {
    return false;
  }

  const normalized = value.replace(/\./g, "").replace(",", ".");
  const numeric = Number(normalized);

  return Number.isFinite(numeric) && numeric > 0;
}

export function isBetween(v: number, min: number, max: number, inclusive: boolean = true): boolean {
  return Number.isFinite(v) && ( inclusive ? (v >= min && v <= max) : (v > min && v < max) )
}

export function nonEmpty(v: unknown): boolean {
  return typeof v === "string" && !isWhitespace(v);
}

export function isWhitespace(value: string): boolean {
  return value.trim().length === 0;
}

export function isValidImage(img: { url: string, file: File | null}): boolean {
  return !!img && ( nonEmpty(img.url) || (img.file instanceof File && ['image/png', 'image/jpeg', 'image/jpg'].includes(img.file.type)) );
}

export function isValidTimestampedImage(img: {url: string, file: File | null, timestamp: number}): boolean {
  return !!img && isValidImage(img) && Number.isFinite(img.timestamp) && img.timestamp >= 0;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;

  if (typeof a !== typeof b) return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && a !== null && b !== null) {
    const keysA = Object.keys(a as object);
    const keysB = Object.keys(b as object);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}