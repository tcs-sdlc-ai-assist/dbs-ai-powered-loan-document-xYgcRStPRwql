import { APPLICATION_STATUSES, RECOMMENDATION_TYPES, ALLOWED_MIME_TYPES } from "@/lib/constants";
import type { ApplicationStatusEnum, RecommendationType } from "@prisma/client";
import { format, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// cn – classname merger
// ---------------------------------------------------------------------------
// Since clsx and tailwind-merge are not in package.json, we implement a
// lightweight classname merger that handles the common cases.
type ClassValue = string | number | boolean | undefined | null | ClassValue[];

function toVal(mix: ClassValue): string {
  if (typeof mix === "string") return mix;
  if (typeof mix === "number") return String(mix);
  if (Array.isArray(mix)) {
    let str = "";
    for (let i = 0; i < mix.length; i++) {
      const val = toVal(mix[i]);
      if (val) {
        str += (str ? " " : "") + val;
      }
    }
    return str;
  }
  return "";
}

export function cn(...inputs: ClassValue[]): string {
  let result = "";
  for (let i = 0; i < inputs.length; i++) {
    const val = toVal(inputs[i]);
    if (val) {
      result += (result ? " " : "") + val;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// generateApplicationId – DBS-XXXX format
// ---------------------------------------------------------------------------
export function generateApplicationId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DBS-${num}`;
}

// ---------------------------------------------------------------------------
// formatCurrency – formats a number as SGD currency
// ---------------------------------------------------------------------------
export function formatCurrency(amount: number, currency: string = "SGD"): string {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// formatDate – formats a Date or ISO string
// ---------------------------------------------------------------------------
export function formatDate(
  date: Date | string | null | undefined,
  formatStr: string = "dd MMM yyyy"
): string {
  if (!date) return "—";
  try {
    const parsed = typeof date === "string" ? parseISO(date) : date;
    return format(parsed, formatStr);
  } catch {
    return "—";
  }
}

// ---------------------------------------------------------------------------
// maskSensitiveData – masks all but the last N characters
// ---------------------------------------------------------------------------
export function maskSensitiveData(value: string, visibleChars: number = 4): string {
  if (!value) return "";
  if (value.length <= visibleChars) return value;
  const masked = "*".repeat(value.length - visibleChars);
  return masked + value.slice(-visibleChars);
}

// ---------------------------------------------------------------------------
// parseFileSize – converts bytes to a human-readable string
// ---------------------------------------------------------------------------
export function parseFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = bytes / Math.pow(k, i);
  return `${size.toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

// ---------------------------------------------------------------------------
// validateFileType – checks if a MIME type is allowed
// ---------------------------------------------------------------------------
export function validateFileType(mimeType: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mimeType);
}

// ---------------------------------------------------------------------------
// calculateConfidenceScore – weighted average of confidence values
// ---------------------------------------------------------------------------
export function calculateConfidenceScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((acc, score) => acc + score, 0);
  return Math.round((sum / scores.length) * 100) / 100;
}

// ---------------------------------------------------------------------------
// slugify – converts a string to a URL-friendly slug
// ---------------------------------------------------------------------------
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

// ---------------------------------------------------------------------------
// truncateText – truncates text to a maximum length with ellipsis
// ---------------------------------------------------------------------------
export function truncateText(text: string, maxLength: number = 100): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

// ---------------------------------------------------------------------------
// getStatusColor – returns the Tailwind color classes for a status
// ---------------------------------------------------------------------------
export function getStatusColor(status: ApplicationStatusEnum): string {
  const config = APPLICATION_STATUSES[status];
  return config ? config.color : "bg-gray-100 text-gray-800";
}

// ---------------------------------------------------------------------------
// getRecommendationColor – returns the Tailwind color classes for a recommendation
// ---------------------------------------------------------------------------
export function getRecommendationColor(recommendation: RecommendationType): string {
  const config = RECOMMENDATION_TYPES[recommendation];
  return config ? config.color : "bg-gray-100 text-gray-800";
}