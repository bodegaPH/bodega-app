import { z } from "zod";
import { cuidSchema } from "@/lib/schemas/common";
import { MovementType } from "@/features/movements/types";

const movementBaseSchema = z
  .object({
    itemId: cuidSchema,
    locationId: cuidSchema,
  })
  .strict();

const receiveOrIssueMovementSchema = movementBaseSchema.extend({
  type: z.enum([MovementType.RECEIVE, MovementType.ISSUE]),
  quantity: z.coerce.number().finite().positive("Quantity must be greater than zero"),
});

const adjustmentMovementSchema = movementBaseSchema.extend({
  type: z.literal(MovementType.ADJUSTMENT),
  quantity: z.coerce.number().finite(),
  reason: z.string().trim().min(1, "Reason is required for adjustments"),
});

export const createMovementSchema = z.union([
  receiveOrIssueMovementSchema,
  adjustmentMovementSchema,
]);

export type CreateMovementInput = z.infer<typeof createMovementSchema>;
