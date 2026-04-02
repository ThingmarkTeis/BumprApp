import { z } from "zod";

export const saveVillaSchema = z.object({
  villa_id: z.string().uuid("villa_id must be a valid UUID"),
});

export type SaveVillaInput = z.infer<typeof saveVillaSchema>;
