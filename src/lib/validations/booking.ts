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

export const switchVillaSchema = z.object({
  // Accept multiple naming conventions (snake_case, camelCase)
  new_villa_id: z.string().uuid().optional(),
  villaId: z.string().uuid().optional(),
  toVillaId: z.string().uuid().optional(),
  switch_from_booking_id: z.string().uuid().optional(),
  switchFromBookingId: z.string().uuid().optional(),
  bookingId: z.string().uuid().optional(),
  auto_bump_delay_minutes: z.number().int().min(30).max(1440).optional(),
  autoBumpDelayMinutes: z.number().int().min(30).max(1440).optional(),
  check_out_date: dateString.optional(),
  checkOutDate: dateString.optional(),
  arrival_time: z.string().min(1).optional(),
  arrivalTime: z.string().min(1).optional(),
  num_guests: z.number().int().min(1).optional(),
  guests: z.number().int().min(1).optional(),
  house_rules_accepted: z.boolean().optional(),
  houseRulesAccepted: z.boolean().optional(),
}).refine(
  (d) => !!(d.new_villa_id || d.villaId || d.toVillaId),
  { message: "new_villa_id is required", path: ["new_villa_id"] }
).refine(
  (d) => !!(d.switch_from_booking_id || d.switchFromBookingId || d.bookingId),
  { message: "switch_from_booking_id is required", path: ["switch_from_booking_id"] }
).refine(
  (d) => (d.auto_bump_delay_minutes ?? d.autoBumpDelayMinutes) !== undefined,
  { message: "auto_bump_delay_minutes is required (30–1440)", path: ["auto_bump_delay_minutes"] }
).refine(
  (d) => !!(d.check_out_date || d.checkOutDate),
  { message: "check_out_date is required", path: ["check_out_date"] }
).refine(
  (d) => !!(d.arrival_time || d.arrivalTime),
  { message: "arrival_time is required", path: ["arrival_time"] }
).refine(
  (d) => (d.num_guests ?? d.guests) !== undefined,
  { message: "num_guests is required", path: ["num_guests"] }
).refine(
  (d) => (d.house_rules_accepted ?? d.houseRulesAccepted) === true,
  { message: "You must accept the house rules", path: ["house_rules_accepted"] }
);

export type SwitchVillaInput = z.infer<typeof switchVillaSchema>;
