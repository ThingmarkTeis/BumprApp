import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD format")
  .refine((d) => !isNaN(Date.parse(d)), "Invalid date");

export const createBookingSchema = z.object({
  // Accept both naming conventions (web: villaId/checkIn, mobile: villa_id/check_in_date)
  villa_id: z.string().uuid().optional(),
  villaId: z.string().uuid().optional(),
  check_in_date: dateString.optional(),
  checkIn: dateString.optional(),
  check_out_date: dateString.optional(),
  checkOut: dateString.optional(),
  arrival_time: z.string().optional(),
  arrivalTime: z.string().optional(),
  arrivalToday: z.boolean().optional(),
  num_guests: z.number().int().min(1).optional(),
  guests: z.number().int().min(1).optional(),
  house_rules_accepted: z.boolean().optional(),
  payment_method: z.string().optional(),
}).refine(
  (data) => !!(data.villa_id || data.villaId),
  { message: "villa_id is required", path: ["villa_id"] }
).refine(
  (data) => !!(data.check_in_date || data.checkIn),
  { message: "check_in_date is required", path: ["check_in_date"] }
).refine(
  (data) => !!(data.check_out_date || data.checkOut),
  { message: "check_out_date is required", path: ["check_out_date"] }
);

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const extendBookingSchema = z.object({
  new_check_out_date: dateString,
});

export type ExtendBookingInput = z.infer<typeof extendBookingSchema>;

export const updateCheckOutSchema = z.object({
  new_check_out_date: dateString,
});

export type UpdateCheckOutInput = z.infer<typeof updateCheckOutSchema>;
