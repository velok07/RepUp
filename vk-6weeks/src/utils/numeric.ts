export function sanitizeDigitsInput(value: string, maxLength = 4) {
  const digitsOnly = value.replace(/\D/g, "").slice(0, maxLength);

  if (!digitsOnly) {
    return "";
  }

  return digitsOnly.replace(/^0+(?=\d)/, "");
}

export function parsePositiveInt(value: string) {
  if (!value) return null;

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
