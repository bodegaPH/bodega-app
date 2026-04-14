import type { MovementType, PrismaClient } from "@prisma/client";
import type {
  MonitoringAuditRepoQuery,
  MonitoringAuditRowDto,
  MonitoringOrganizationsListRowDto,
  MonitoringOrganizationsRepoQuery,
  MonitoringOverviewDto,
  MonitoringUsersListRowDto,
  MonitoringUsersRepoQuery,
} from "./types";

export class PlatformAdminMonitoringRepository {
  constructor(private readonly db: PrismaClient) {}

  async getOverview(): Promise<MonitoringOverviewDto> {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [lowStockRaw, recentAdjustmentsCount, recentIssues, orgCount, userCount] =
      await Promise.all([
        this.db.$queryRaw<Array<{ count: number | string | bigint }>>`
          SELECT COUNT(*)::int AS count
          FROM "CurrentStock" cs
          JOIN "Item" i ON i.id = cs."itemId"
          WHERE i."isActive" = true
            AND i."lowStockThreshold" IS NOT NULL
            AND i."lowStockThreshold" > 0
            AND cs."quantity" <= i."lowStockThreshold"
        `,
      this.db.movement.count({
        where: {
          type: "ADJUSTMENT",
          createdAt: { gte: last7Days },
        },
      }),
      this.db.movement.findMany({
        where: {
          type: "ISSUE",
          createdAt: { gte: last7Days },
        },
        select: {
          quantity: true,
          item: {
            select: {
              currentStock: {
                select: {
                  quantity: true,
                },
              },
            },
          },
        },
      }),
      this.db.organization.count(),
      this.db.user.count(),
    ]);

    const largeOutboundCount = recentIssues.reduce((count, issue) => {
      const currentQty = issue.item.currentStock.reduce(
        (sum, stock) => sum + Number(stock.quantity),
        0,
      );
      const issuedQty = Number(issue.quantity);
      const percentOfStock = currentQty > 0 ? (issuedQty / currentQty) * 100 : 100;
      return percentOfStock >= 50 ? count + 1 : count;
    }, 0);

    const lowStockCount = Number(lowStockRaw[0]?.count ?? 0);

    return {
      lowStockCount,
      recentAdjustmentsCount,
      largeOutboundCount,
      orgCount,
      userCount,
    };
  }

  async listUsers(
    query: MonitoringUsersRepoQuery,
  ): Promise<{ rows: MonitoringUsersListRowDto[]; total: number }> {
    const where = {
      ...(query.systemRole ? { systemRole: query.systemRole } : {}),
      NOT: { id: query.actorUserId },
      ...(query.orgId
        ? {
            memberships: {
              some: {
                orgId: query.orgId,
              },
            },
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        include: {
          memberships: {
            where: query.orgId
              ? {
                  orgId: query.orgId,
                }
              : undefined,
            include: {
              organization: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 1,
          },
        },
        orderBy:
          query.sortBy === "email"
            ? { email: query.sortOrder }
            : { createdAt: query.sortOrder },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.user.count({ where }),
    ]);

    return {
      rows: users.map((user) => {
        const primaryMembership = user.memberships[0];

        return {
          userId: user.id,
          email: user.email,
          name: user.name,
          systemRole: user.systemRole,
          orgId: primaryMembership?.organization.id ?? "",
          orgName: primaryMembership?.organization.name ?? "-",
          orgRole: primaryMembership?.role ?? "ORG_USER",
          joinedAt: (primaryMembership?.createdAt ?? user.createdAt).toISOString(),
        };
      }),
      total,
    };
  }

  async listOrganizations(
    query: MonitoringOrganizationsRepoQuery,
  ): Promise<{ rows: MonitoringOrganizationsListRowDto[]; total: number }> {
    const [organizations, total] = await Promise.all([
      this.db.organization.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          createdAt: true,
          _count: {
            select: {
              memberships: true,
            },
          },
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.organization.count(),
    ]);

    return {
      rows: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        isActive: org.isActive,
        createdAt: org.createdAt.toISOString(),
        memberCount: org._count.memberships,
      })),
      total,
    };
  }

  async listAudit(
    query: MonitoringAuditRepoQuery,
  ): Promise<{ rows: MonitoringAuditRowDto[]; total: number }> {
    const where = {
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.orgId ? { orgId: query.orgId } : {}),
      ...(query.itemId ? { itemId: query.itemId } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.movement.findMany({
        where,
        include: {
          organization: {
            select: {
              id: true,
              name: true,
            },
          },
          item: {
            select: {
              id: true,
              name: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: query.sortOrder,
        },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.db.movement.count({ where }),
    ]);

    return {
      rows: rows.map((row) => ({
        movementId: row.id,
        orgId: row.organization.id,
        orgName: row.organization.name,
        itemId: row.item.id,
        itemName: row.item.name,
        locationId: row.location.id,
        locationName: row.location.name,
        type: row.type as MovementType,
        quantity: row.quantity.toString(),
        reason: row.reason,
        createdAt: row.createdAt.toISOString(),
        actorUserId: row.createdBy.id,
        actorEmail: row.createdBy.email,
        actorName: row.createdBy.name,
      })),
      total,
    };
  }

  getExportEntries() {
    return [
      {
        label: "Movement Ledger CSV (Direct via Audit)",
        href: "/admin/audit",
        description: "Export the movement ledger directly from the Admin Audit flow based on your current filters.",
      },
      {
        label: "Inventory CSV (Org-Scoped Workflow)",
        href: "/admin",
        description: "This is an org-scoped dataset. Navigate to a specific organization's inventory page to export.",
      },
    ];
  }
}
