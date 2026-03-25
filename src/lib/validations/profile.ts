import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z
    .string()
    .min(1, "Display name is required")
    .max(50, "Display name must be 50 characters or less")
    .optional(),
  phone: z
    .string()
    .regex(/^\+?[0-9\s\-()]{7,20}$/, "Invalid phone number format")
    .optional()
    .nullable(),
  avatar_url: z.string().url("Must be a valid URL").optional().nullable(),
  language: z.enum(["en", "id"], { message: "Language must be 'en' or 'id'" }).optional(),
  preferred_currency: z.string().length(3, "Must be a 3-letter currency code").optional(),
  notification_preferences: z
    .object({
      email: z.boolean(),
      push: z.boolean(),
      whatsapp: z.boolean(),
    })
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const deleteAccountSchema = z.object({
  confirm: z.literal("DELETE", {
    message: "You must send { \"confirm\": \"DELETE\" } to delete your account",
  }),
});
