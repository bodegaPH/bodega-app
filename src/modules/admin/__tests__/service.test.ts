import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PlatformAdminMonitoringService,
  validateAuditQuery,
  validateUsersQuery,
} from "../service";

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  listAudit: vi.fn(),
  listOrganizations: vi.fn(),
  getOverview: vi.fn(),
  getExportEntries: vi.fn(),
}));

describe("platform-admin-monitoring service validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects audit windows larger than 90 days", () => {
    const from = new Date(Date.now() - 91 * 24 * 60 * 60 * 1000);
    const to = new Date();

    expect(() => validateAuditQuery({ from, to })).toThrow(
      /audit date window must be at most 90 days/,
    );
  });

  it("rejects audit query when from is after to", () => {
    const from = new Date("2026-04-10T00:00:00.000Z");
    const to = new Date("2026-04-09T00:00:00.000Z");

    expect(() => validateAuditQuery({ from, to })).toThrow(/from must be less than or equal to to/);
  });

  it("enforces users sort allowlist", () => {
    expect(() =>
      validateUsersQuery({
        actorUserId: "actor_1",
        sortBy: "createdAt" as never,
      }),
    ).toThrow(/sortBy must be one of: joinedAt, email/);
  });

  it("enforces audit sort allowlist", () => {
    expect(() =>
      validateAuditQuery({
        sortBy: "email" as never,
      }),
    ).toThrow(/sortBy must be one of: createdAt/);
  });

  it("rejects users pageSize above cap", () => {
    expect(() => validateUsersQuery({ actorUserId: "actor_1", pageSize: 101 })).toThrow(
      /pageSize must be less than or equal to 100/,
    );
  });

  it("does not call repository on malformed filters", async () => {
    const service = new PlatformAdminMonitoringService(mocks as never);

    await expect(
      service.getAudit({
        orgId: "   ",
      }),
    ).rejects.toThrow(/orgId must be a non-empty string/);

    expect(mocks.listAudit).not.toHaveBeenCalled();
  });

  it("forwards valid org filter and preserves cross-org rows", async () => {
    const service = new PlatformAdminMonitoringService(mocks as never);
    mocks.listUsers.mockResolvedValue({
      total: 2,
      rows: [
        {
          userId: "u1",
          email: "a@example.com",
          name: "A",
          systemRole: "USER",
          orgId: "org_1",
          orgName: "Org 1",
          orgRole: "ORG_USER",
          joinedAt: "2026-04-14T00:00:00.000Z",
        },
        {
          userId: "u2",
          email: "b@example.com",
          name: "B",
          systemRole: "PLATFORM_ADMIN",
          orgId: "org_2",
          orgName: "Org 2",
          orgRole: "ORG_ADMIN",
          joinedAt: "2026-04-14T00:00:00.000Z",
        },
      ],
    });

    const result = await service.getUsers({
      page: 1,
      pageSize: 25,
      orgId: "org_1",
      actorUserId: "admin_1",
    });

    expect(mocks.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org_1", page: 1, pageSize: 25 }),
    );
    expect(result.rows).toHaveLength(2);
    expect(result.pagination.total).toBe(2);
  });

  it("forwards actorUserId filter to repository", async () => {
    const service = new PlatformAdminMonitoringService(mocks as never);
    mocks.listUsers.mockResolvedValue({ total: 0, rows: [] });

    await service.getUsers({ page: 1, pageSize: 25, actorUserId: "self_1" });

    expect(mocks.listUsers).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: "self_1" }),
    );
  });

  it("applies default audit bounds when from and to are missing", () => {
    const before = Date.now();
    const validated = validateAuditQuery({});
    const after = Date.now();

    expect(validated.from.getTime()).toBeGreaterThanOrEqual(before - 90 * 24 * 60 * 60 * 1000 - 1000);
    expect(validated.to.getTime()).toBeLessThanOrEqual(after + 1000);
    expect(validated.to.getTime() - validated.from.getTime()).toBeLessThanOrEqual(
      90 * 24 * 60 * 60 * 1000,
    );
  });

  it("derives from when only to is provided", () => {
    const to = new Date("2026-04-15T00:00:00.000Z");
    const validated = validateAuditQuery({ to });

    expect(validated.to.toISOString()).toBe("2026-04-15T00:00:00.000Z");
    expect(validated.from.toISOString()).toBe("2026-01-15T00:00:00.000Z");
  });

  it("caps to at now or 90 days when only from is provided", () => {
    const from = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const validated = validateAuditQuery({ from });

    expect(validated.from.toISOString()).toBe(from.toISOString());
    expect(validated.to.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
    expect(validated.to.getTime() - validated.from.getTime()).toBeLessThanOrEqual(
      90 * 24 * 60 * 60 * 1000,
    );
  });

  it("requires actorUserId for users query", () => {
    expect(() => validateUsersQuery({ page: 1, pageSize: 25 })).toThrow(/actorUserId is required/);
  });

  it("returns organizations with pagination", async () => {
    const service = new PlatformAdminMonitoringService(mocks as never);
    mocks.listOrganizations.mockResolvedValue({
      rows: [
        {
          id: "org_1",
          name: "Org 1",
          isActive: true,
          createdAt: "2026-04-15T00:00:00.000Z",
          memberCount: 2,
        },
      ],
      total: 1,
    });

    const result = await service.getOrganizations({ page: 1, pageSize: 25 });

    expect(mocks.listOrganizations).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    expect(result.pagination.total).toBe(1);
    expect(result.rows[0]?.id).toBe("org_1");
  });
});
