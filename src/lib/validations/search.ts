import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
  .refine((d) => !isNaN(Date.parse(d)), "Invalid date");

const boundsString = z
  .string()
  .regex(
    /^-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*,-?\d+\.?\d*$/,
    "Must be sw_lat,sw_lng,ne_lat,ne_lng"
  );

export const searchParamsSchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90).optional(),
    lng: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().int().min(1).max(50).default(15).optional(),
    bounds: boundsString.optional(),
    check_in: dateString.optional(),
    check_out: dateString.optional(),
    min_price: z.coerce.number().int().min(0).optional(),
    max_price: z.coerce.number().int().min(0).optional(),
    bedrooms: z.coerce.number().int().min(1).optional(),
    guests: z.coerce.number().int().min(1).optional(),
    amenities: z.string().optional(),
    sort: z.enum(["distance", "price_asc", "price_desc", "newest"]).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .refine(
    (data) => {
      if (data.check_in && data.check_out) {
        return new Date(data.check_in) < new Date(data.check_out);
      }
      return true;
    },
    { message: "check_in must be before check_out", path: ["check_out"] }
  )
  .refine(
    (data) => {
      if (data.min_price != null && data.max_price != null) {
        return data.min_price <= data.max_price;
      }
      return true;
    },
    { message: "min_price must be <= max_price", path: ["max_price"] }
  );

export type SearchParams = z.infer<typeof searchParamsSchema>;
