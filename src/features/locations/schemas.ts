import { z } from "zod";

export const createLocationSchema = z
  .object({
    name: z.string().trim().min(1, "Location name is required").max(100, "Location name must be 100 characters or fewer"),
    isDefault: z.boolean().optional(),
  })
  .strict();

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z
  .object({
    name: z.string().trim().min(1, "Location name is required").max(100, "Location name must be 100 characters or fewer").optional(),
    isDefault: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
