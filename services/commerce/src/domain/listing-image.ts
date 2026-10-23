import { AppError } from "./errors";

export const listingImageTypes = ["image/jpeg", "image/png", "image/webp"] as const;

export type ListingImageType = (typeof listingImageTypes)[number];

export const maxListingImageBytes = 2_000_000;

const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isListingImageType(value: string): value is ListingImageType {
  return value === "image/jpeg" || value === "image/png" || value === "image/webp";
}

function matchesMagic(contentType: ListingImageType, bytes: Buffer): boolean {
  if (contentType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (contentType === "image/png") {
    return bytes.length >= pngSignature.length && bytes.subarray(0, pngSignature.length).equals(pngSignature);
  }
  return (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export function decodeListingImage(
  contentType: string,
  dataBase64: string,
): { contentType: ListingImageType; bytes: Buffer } {
  if (!isListingImageType(contentType)) {
    throw new AppError("validation_error", "Image must be a JPEG, PNG, or WebP.");
  }
  const compact = dataBase64.replace(/\s/g, "");
  const comma = compact.indexOf(",");
  const payload = comma === -1 ? compact : compact.slice(comma + 1);
  if (payload.length === 0 || payload.length > 3_500_000 || payload.length % 4 !== 0) {
    throw new AppError("validation_error", "Image data is invalid.");
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
    throw new AppError("validation_error", "Image data is invalid.");
  }
  const bytes = Buffer.from(payload, "base64");
  if (bytes.length === 0 || bytes.length > maxListingImageBytes) {
    throw new AppError("validation_error", "Image is too large.");
  }
  if (!matchesMagic(contentType, bytes)) {
    throw new AppError("validation_error", "Image must be a JPEG, PNG, or WebP.");
  }
  return { contentType, bytes };
}
