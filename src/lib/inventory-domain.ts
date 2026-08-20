export function suggestCategoryCode(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);

  if (words.length >= 2) {
    return words
      .slice(0, 4)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
  }

  return (words[0] ?? "").slice(0, 3).toUpperCase();
}

export function currencyFractionDigits(currencyCode: string) {
  return new Intl.NumberFormat("en", {
    currency: currencyCode,
    style: "currency",
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function parseMoneyToMinor(value: string, currencyCode: string) {
  const normalized = value.trim().replaceAll(",", "");
  const fractionDigits = currencyFractionDigits(currencyCode);
  const match = normalized.match(/^(\d+)(?:\.(\d*))?$/);

  if (!match) {
    throw new Error("Enter a valid positive buying price.");
  }

  const fraction = match[2] ?? "";
  if (fraction.length > fractionDigits) {
    throw new Error(`Use no more than ${fractionDigits} decimal places.`);
  }

  const scale = 10 ** fractionDigits;
  const minor =
    Number(match[1]) * scale + Number(fraction.padEnd(fractionDigits, "0") || "0");

  if (!Number.isSafeInteger(minor) || minor <= 0) {
    throw new Error("Enter a valid positive buying price.");
  }

  return minor;
}

export function formatMoney(minor: number, currencyCode: string) {
  const scale = 10 ** currencyFractionDigits(currencyCode);
  return new Intl.NumberFormat(undefined, {
    currency: currencyCode,
    style: "currency",
  }).format(minor / scale);
}

export function dateInTimeZone(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: timezone,
    year: "numeric",
  }).formatToParts(date);
  const value = (type: "day" | "month" | "year") =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function validateIntakeDate(value: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Use the date format YYYY-MM-DD.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Enter a valid calendar date.");
  }

  if (value > today) {
    throw new Error("Intake date cannot be in the future.");
  }
}
