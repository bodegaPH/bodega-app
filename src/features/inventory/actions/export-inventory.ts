"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { InventoryApiError } from "@/modules/inventory";
import { generateInventoryCsvExport } from "@/modules/inventory/service";

type ExportResult =
  | { success: true; data: { filename: string; content: string; rowCount: number } }
  | { success: false; error: string };

/**
 * Server action to export inventory as CSV
 */
export async function exportInventoryCsv(orgId: string): Promise<ExportResult> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }

  const validatedOrgId = typeof orgId === "string" ? orgId.trim() : "";
  if (!validatedOrgId) {
    return { success: false, error: "Organization is required" };
  }

  // Verify org membership directly by userId+orgId.
  // Do not rely on activeOrgId here (can be stale after org switch).
  const membership = await prisma.membership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: validatedOrgId,
      },
    },
    select: { role: true },
  });

  if (!membership) {
    return { success: false, error: "Not a member of this organization" };
  }

  if (membership.role !== "ORG_ADMIN" && membership.role !== "ORG_USER") {
    return { success: false, error: "Insufficient permissions" };
  }

  try {
    const result = await generateInventoryCsvExport(validatedOrgId);

    return {
      success: true,
      data: {
        filename: result.filename,
        content: result.content,
        rowCount: result.rowCount,
      },
    };
  } catch (error: unknown) {
    console.error("[exportInventoryCsv] Export failed:", {
      orgId: validatedOrgId,
      userId: session.user.id,
      error: error instanceof Error ? error.message : error,
    });

    if (error instanceof InventoryApiError) {
      return { success: false, error: error.message };
    }

    return {
      success: false,
      error: "Failed to generate CSV export. Please try again.",
    };
  }
}
