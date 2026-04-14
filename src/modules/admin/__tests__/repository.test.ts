import { describe, expect, it, vi } from "vitest";
import { PlatformAdminMonitoringRepository } from "../repository";

describe("platform-admin-monitoring repository", () => {
  it("enforces actor self-exclusion in users query", async () => {
    const db = {
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
    } as never;

    const repo = new PlatformAdminMonitoringRepository(db);

    await repo.listUsers({
      page: 1,
      pageSize: 25,
      actorUserId: "user_self",
      sortBy: "joinedAt",
      sortOrder: "desc",
    });

    expect((db as any).user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { id: "user_self" },
        }),
      }),
    );
    expect((db as any).user.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: { id: "user_self" },
        }),
      }),
    );
  });
});
