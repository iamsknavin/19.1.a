import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL slug from a politician name.
 * "Narendra Modi" → "narendra-modi"
 * Handles Hindi diacritics by stripping them.
 * Appends constituency to resolve duplicate names.
 */
export function generateSlug(name: string, constituency?: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim hyphens

  if (constituency) {
    const cSlug = constituency
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `${base}-${cSlug}`;
  }

  return base;
}

/** Convert state name to URL slug: "Tamil Nadu" → "tamil-nadu" */
export function stateToSlug(state: string): string {
  return state
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "-");
}

/** Convert slug back to display name: "tamil-nadu" → "Tamil Nadu" */
export function slugToDisplay(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Indian house labels */
export const HOUSE_LABELS: Record<string, string> = {
  lok_sabha: "Lok Sabha",
  rajya_sabha: "Rajya Sabha",
  vidhan_sabha: "Vidhan Sabha",
};

/** Criminal case status colors */
export const CASE_STATUS_COLORS: Record<string, string> = {
  pending: "text-warning border-warning",
  convicted: "text-danger border-danger",
  acquitted: "text-safe border-safe",
  discharged: "text-text-secondary border-border",
  stayed: "text-warning border-warning",
  disposed: "text-text-secondary border-border",
  transferred: "text-text-secondary border-border",
  unknown: "text-text-muted border-border",
};

/** All Indian states with slugs */
export const INDIAN_STATES = [
  { name: "Andhra Pradesh", slug: "andhra-pradesh" },
  { name: "Arunachal Pradesh", slug: "arunachal-pradesh" },
  { name: "Assam", slug: "assam" },
  { name: "Bihar", slug: "bihar" },
  { name: "Chhattisgarh", slug: "chhattisgarh" },
  { name: "Goa", slug: "goa" },
  { name: "Gujarat", slug: "gujarat" },
  { name: "Haryana", slug: "haryana" },
  { name: "Himachal Pradesh", slug: "himachal-pradesh" },
  { name: "Jharkhand", slug: "jharkhand" },
  { name: "Karnataka", slug: "karnataka" },
  { name: "Kerala", slug: "kerala" },
  { name: "Madhya Pradesh", slug: "madhya-pradesh" },
  { name: "Maharashtra", slug: "maharashtra" },
  { name: "Manipur", slug: "manipur" },
  { name: "Meghalaya", slug: "meghalaya" },
  { name: "Mizoram", slug: "mizoram" },
  { name: "Nagaland", slug: "nagaland" },
  { name: "Odisha", slug: "odisha" },
  { name: "Punjab", slug: "punjab" },
  { name: "Rajasthan", slug: "rajasthan" },
  { name: "Sikkim", slug: "sikkim" },
  { name: "Tamil Nadu", slug: "tamil-nadu" },
  { name: "Telangana", slug: "telangana" },
  { name: "Tripura", slug: "tripura" },
  { name: "Uttar Pradesh", slug: "uttar-pradesh" },
  { name: "Uttarakhand", slug: "uttarakhand" },
  { name: "West Bengal", slug: "west-bengal" },
  { name: "Delhi", slug: "delhi" },
  { name: "Jammu & Kashmir", slug: "jammu-kashmir" },
  { name: "Ladakh", slug: "ladakh" },
  { name: "Puducherry", slug: "puducherry" },
  { name: "Andaman & Nicobar", slug: "andaman-nicobar" },
  { name: "Chandigarh", slug: "chandigarh" },
  { name: "Dadra & Nagar Haveli", slug: "dadra-nagar-haveli" },
  { name: "Lakshadweep", slug: "lakshadweep" },
] as const;
