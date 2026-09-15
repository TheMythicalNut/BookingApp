// password-validator.ts

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  score?: number; // 0–4
}

const MIN_LENGTH = 12;
const MAX_LENGTH = 48;

export function isValidPassword(
  password: string
): PasswordValidationResult {
  const errors: string[] = [];

  // Hard guard against pathological inputs
  if (typeof password !== "string") {
    return { valid: false, errors: ["ERRORS.PASSWORD_MUST_BE_STRING"], score: 0 };
  }

  // Normalize Unicode to prevent homoglyph tricks
  const normalized = password.normalize("NFKC");

  if (normalized.length > 10_000) {
    return {
      valid: false,
      errors: ["ERRORS.PASSWORD_EXCEEDS_PROCESSING_LENGTH"],
      score: 0,
    };
  }

  if (normalized.length < MIN_LENGTH) {
    return {
        valid: false,
        errors: ["ERRORS.PASSWORD_MIN_LENGTH"],
        score: 0
    }
  }

  if (normalized.length > MAX_LENGTH) {
    return {
        valid: false,
        errors: ["ERRORS.PASSWORD_MAX_LENGTH"],
        score: 0
    }
  }

  const score = calculateScore(normalized, errors);

  return {
    valid: errors.length === 0,
    errors,
    score,
  };
}


function calculateScore(password: string, errors: string[]): number {
  if (errors.length > 0) return 0;

  let score = 0;
  const length = password.length;

  // Length tiers (primary NIST signal)
  if (length >= 12) score++;
  if (length >= 16) score++;
  if (length >= 20) score++;

  // Character diversity
  let pool = 0;

  if (/[a-z]/u.test(password)) pool += 26;
  if (/[A-Z]/u.test(password)) pool += 26;
  if (/\d/u.test(password)) pool += 10;

  // Unicode-safe symbol detection
  if (/[^\p{L}\p{N}\s]/u.test(password)) pool += 32;

  // Rough entropy estimate
  const entropy = Math.log2(Math.pow(pool || 1, length));

  if (entropy > 60) score++;
  if (entropy > 80) score++;

  return Math.min(score, 4);
}
