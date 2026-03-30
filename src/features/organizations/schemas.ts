import { z } from "zod";

export const updateOrganizationSchema = z
  .object({
    name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(100, "Organization name must be 100 characters or fewer"),
  })
  .strict();

export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
