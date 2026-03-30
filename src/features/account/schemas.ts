import { z } from "zod";
import { emailSchema } from "@/lib/schemas/common";

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required"),
    email: emailSchema,
    currentPassword: z.string().optional(),
  })
  .strict();

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(12, "Password must be at least 12 characters")
      .max(72, "Password must not exceed 72 characters"),
  })
  .strict();

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
