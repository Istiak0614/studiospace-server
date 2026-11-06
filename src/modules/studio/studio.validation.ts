import { CATEGORIES, type StudioCategory } from "../../types/studio.js";

export interface StudioInput {
  title: string;
  category: StudioCategory;
  hourlyRate: number;
  securityDeposit: number;
  maxCapacity: number;
  location: string;
  images: string[];
  amenities: string[];
  overview: string;
}

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
const isHttpsUrl = (value: unknown) => typeof value === "string" && /^https:\/\/\S+$/.test(value);

export function validateStudioInput(body: Record<string, unknown>): { data?: StudioInput; errors: string[] } {
  const errors: string[] = [];

  const title = text(body.title);
  const location = text(body.location);
  const overview = text(body.overview);
  const category = body.category as StudioCategory;
  const hourlyRate = Number(body.hourlyRate);
  const securityDeposit = Number(body.securityDeposit);
  const maxCapacity = Number(body.maxCapacity);
  const images = Array.isArray(body.images) ? body.images : [];
  const amenities = Array.isArray(body.amenities) ? body.amenities.map(text).filter(Boolean) : [];

  if (title.length < 3 || title.length > 80) errors.push("Title must be between 3 and 80 characters");
  if (!CATEGORIES.includes(category)) errors.push("Please choose a valid category");
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0 || hourlyRate > 10000) errors.push("Hourly rate must be between 1 and 10,000");
  if (!Number.isFinite(securityDeposit) || securityDeposit < 0) errors.push("Security deposit can't be negative");
  if (!Number.isInteger(maxCapacity) || maxCapacity < 1) errors.push("Capacity must be a whole number of at least 1");
  if (location.length < 3) errors.push("Please enter the studio's location");
  if (images.length < 1 || images.length > 5 || !images.every(isHttpsUrl)) errors.push("Add between 1 and 5 image links (https://)");
  if (amenities.length > 20) errors.push("You can list up to 20 amenities");
  if (overview.length < 20) errors.push("Overview must be at least 20 characters");

  if (errors.length > 0) return { errors };

  return {
    errors,
    data: {
      title, category, hourlyRate, securityDeposit, maxCapacity, location,
      images: images as string[], amenities, overview,
    },
  };
}