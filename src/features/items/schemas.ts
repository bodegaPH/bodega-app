import { z } from "zod";

export const createItemSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
    sku: z
      .string()
      .trim()
      .min(1, "SKU is required")
      .max(64, "SKU must be 64 characters or fewer")
      .transform((sku) => sku.toUpperCase()),
    unit: z.string().trim().min(1, "Unit is required").max(32, "Unit must be 32 characters or fewer"),
    category: z
      .union([
        z.string().trim().max(80, "Category must be 80 characters or fewer"),
        z.null(),
      ])
      .optional(),
    lowStockThreshold: z.coerce.number().positive("Low stock threshold must be a positive number").optional(),
  })
  .strict();

export type CreateItemInput = z.infer<typeof createItemSchema>;

export const updateItemSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer").optional(),
    unit: z.string().trim().min(1, "Unit is required").max(32, "Unit must be 32 characters or fewer").optional(),
    category: z
      .union([
        z.string().trim().max(80, "Category must be 80 characters or fewer"),
        z.null(),
      ])
      .optional(),
    lowStockThreshold: z.coerce.number().positive("Low stock threshold must be a positive number").optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export type UpdateItemInput = z.infer<typeof updateItemSchema>;
