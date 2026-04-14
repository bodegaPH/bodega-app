import type { MovementType, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PlatformAdminMonitoringApiError } from "./errors";
import { PlatformAdminMonitoringRepository } from "./repository";
import type {
  MonitoringAuditListResponse,
  MonitoringAuditQuery,
  MonitoringAuditRepoQuery,
  MonitoringAuditSortField,
  MonitoringExportEntryDto,
  MonitoringOrganizationsListResponse,
  MonitoringOrganizationsQuery,
  MonitoringOrganizationsRepoQuery,
  MonitoringOverviewDto,
  MonitoringSortOrder,
  MonitoringUsersListResponse,
  MonitoringUsersQuery,
  MonitoringUsersRepoQuery,
  MonitoringUsersSortField,
} from "./types";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const MAX_AUDIT_WINDOW_DAYS = 90;

export { PlatformAdminMonitoringApiError } from "./errors";

function parsePositiveInt(value: number | undefined, field: string, fallback: number): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new PlatformAdminMonitoringApiError(
      `${field} must be an integer greater than or equal to 1`,
      400,
      "VALIDATION_ERROR",
      { field },
    );
  }

  return value;
}

function parsePageSize(pageSize: number | undefined): number {
  const normalized = parsePositiveInt(pageSize, "pageSize", DEFAULT_PAGE_SIZE);
  if (normalized > MAX_PAGE_SIZE) {
    throw new PlatformAdminMonitoringApiError(
      `pageSize must be less than or equal to ${MAX_PAGE_SIZE}`,
      400,
      "VALIDATION_ERROR",
      { field: "pageSize", max: MAX_PAGE_SIZE },
    );
  }

  return normalized;
}

function parseSortOrder(value: MonitoringSortOrder | undefined): MonitoringSortOrder {
  if (!value) {
    return "desc";
  }

  if (value !== "asc" && value !== "desc") {
    throw new PlatformAdminMonitoringApiError(
      "sortOrder must be one of: asc, desc",
      400,
      "VALIDATION_ERROR",
      { field: "sortOrder", allowed: ["asc", "desc"] },
    );
  }

  return value;
}

function parseUsersSort(value: MonitoringUsersSortField | undefined): MonitoringUsersSortField {
  if (!value) {
    return "joinedAt";
  }

  if (value !== "joinedAt" && value !== "email") {
    throw new PlatformAdminMonitoringApiError(
      "sortBy must be one of: joinedAt, email",
      400,
      "VALIDATION_ERROR",
      { field: "sortBy", allowed: ["joinedAt", "email"] },
    );
  }

  return value;
}

function parseAuditSort(value: MonitoringAuditSortField | undefined): MonitoringAuditSortField {
  if (!value) {
    return "createdAt";
  }

  if (value !== "createdAt") {
    throw new PlatformAdminMonitoringApiError(
      "sortBy must be one of: createdAt",
      400,
      "VALIDATION_ERROR",
      { field: "sortBy", allowed: ["createdAt"] },
    );
  }

  return value;
}

function normalizeOptionalId(value: string | undefined, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new PlatformAdminMonitoringApiError(
      `${field} must be a non-empty string when provided`,
      400,
      "VALIDATION_ERROR",
      { field },
    );
  }

  return trimmed;
}

function parseSystemRole(value: SystemRole | undefined): SystemRole | undefined {
  if (!value) {
    return undefined;
  }

  if (value !== "USER" && value !== "SYSTEM_ADMIN" && value !== "PLATFORM_ADMIN") {
    throw new PlatformAdminMonitoringApiError(
      "systemRole must be one of: USER, SYSTEM_ADMIN, PLATFORM_ADMIN",
      400,
      "VALIDATION_ERROR",
      { field: "systemRole", allowed: ["USER", "SYSTEM_ADMIN", "PLATFORM_ADMIN"] },
    );
  }

  return value;
}

function parseMovementType(value: MovementType | undefined): MovementType | undefined {
  if (!value) {
    return undefined;
  }

  if (value !== "RECEIVE" && value !== "ISSUE" && value !== "ADJUSTMENT") {
    throw new PlatformAdminMonitoringApiError(
      "type must be one of: RECEIVE, ISSUE, ADJUSTMENT",
      400,
      "VALIDATION_ERROR",
      { field: "type", allowed: ["RECEIVE", "ISSUE", "ADJUSTMENT"] },
    );
  }

  return value;
}

function validateAuditWindow(from: Date | undefined, to: Date | undefined) {
  if (from && Number.isNaN(from.getTime())) {
    throw new PlatformAdminMonitoringApiError(
      "from must be a valid ISO date",
      400,
      "VALIDATION_ERROR",
      { field: "from" },
    );
  }

  if (to && Number.isNaN(to.getTime())) {
    throw new PlatformAdminMonitoringApiError(
      "to must be a valid ISO date",
      400,
      "VALIDATION_ERROR",
      { field: "to" },
    );
  }

  if (from && to && from > to) {
    throw new PlatformAdminMonitoringApiError(
      "from must be less than or equal to to",
      400,
      "VALIDATION_ERROR",
      { fields: ["from", "to"] },
    );
  }

  if (from) {
    const effectiveTo = to ?? new Date();
    const windowMs = effectiveTo.getTime() - from.getTime();
    const maxWindowMs = MAX_AUDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (windowMs > maxWindowMs) {
      throw new PlatformAdminMonitoringApiError(
        `audit date window must be at most ${MAX_AUDIT_WINDOW_DAYS} days`,
        400,
        "VALIDATION_ERROR",
        { fields: ["from", "to"], maxDays: MAX_AUDIT_WINDOW_DAYS },
      );
    }
  }
}

function getAuditBounds(inputFrom: Date | undefined, inputTo: Date | undefined): {
  from: Date;
  to: Date;
} {
  const maxWindowMs = MAX_AUDIT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  if (!inputFrom && !inputTo) {
    const to = new Date();
    return { from: new Date(to.getTime() - maxWindowMs), to };
  }

  if (!inputFrom && inputTo) {
    return { from: new Date(inputTo.getTime() - maxWindowMs), to: inputTo };
  }

  if (inputFrom && !inputTo) {
    const now = new Date();
    const maxTo = new Date(inputFrom.getTime() + maxWindowMs);
    return {
      from: inputFrom,
      to: maxTo.getTime() < now.getTime() ? maxTo : now,
    };
  }

  return {
    from: inputFrom as Date,
    to: inputTo as Date,
  };
}

export function validateUsersQuery(input: MonitoringUsersQuery): MonitoringUsersRepoQuery {
  const actorUserId = normalizeOptionalId(input.actorUserId, "actorUserId");
  if (!actorUserId) {
    throw new PlatformAdminMonitoringApiError(
      "actorUserId is required",
      400,
      "VALIDATION_ERROR",
      { field: "actorUserId" },
    );
  }

  return {
    page: parsePositiveInt(input.page, "page", DEFAULT_PAGE),
    pageSize: parsePageSize(input.pageSize),
    orgId: normalizeOptionalId(input.orgId, "orgId"),
    actorUserId,
    systemRole: parseSystemRole(input.systemRole),
    sortBy: parseUsersSort(input.sortBy),
    sortOrder: parseSortOrder(input.sortOrder),
  };
}

export function validateOrganizationsQuery(
  input: MonitoringOrganizationsQuery,
): MonitoringOrganizationsRepoQuery {
  return {
    page: parsePositiveInt(input.page, "page", DEFAULT_PAGE),
    pageSize: parsePageSize(input.pageSize),
  };
}

export function validateAuditQuery(input: MonitoringAuditQuery): MonitoringAuditRepoQuery {
  validateAuditWindow(input.from, input.to);
  const bounds = getAuditBounds(input.from, input.to);

  return {
    page: parsePositiveInt(input.page, "page", DEFAULT_PAGE),
    pageSize: parsePageSize(input.pageSize),
    from: bounds.from,
    to: bounds.to,
    type: parseMovementType(input.type),
    orgId: normalizeOptionalId(input.orgId, "orgId"),
    itemId: normalizeOptionalId(input.itemId, "itemId"),
    locationId: normalizeOptionalId(input.locationId, "locationId"),
    sortBy: parseAuditSort(input.sortBy),
    sortOrder: parseSortOrder(input.sortOrder),
  };
}

export class PlatformAdminMonitoringService {
  constructor(private readonly repo: PlatformAdminMonitoringRepository) {}

  async getOverview(): Promise<MonitoringOverviewDto> {
    return this.repo.getOverview();
  }

  async getUsers(query: MonitoringUsersQuery): Promise<MonitoringUsersListResponse> {
    const validated = validateUsersQuery(query);
    const result = await this.repo.listUsers(validated);

    return {
      rows: result.rows,
      pagination: {
        page: validated.page,
        pageSize: validated.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / validated.pageSize),
      },
    };
  }

  async getAudit(query: MonitoringAuditQuery): Promise<MonitoringAuditListResponse> {
    const validated = validateAuditQuery(query);
    const result = await this.repo.listAudit(validated);

    return {
      rows: result.rows,
      pagination: {
        page: validated.page,
        pageSize: validated.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / validated.pageSize),
      },
    };
  }

  async getOrganizations(
    query: MonitoringOrganizationsQuery,
  ): Promise<MonitoringOrganizationsListResponse> {
    const validated = validateOrganizationsQuery(query);
    const result = await this.repo.listOrganizations(validated);

    return {
      rows: result.rows,
      pagination: {
        page: validated.page,
        pageSize: validated.pageSize,
        total: result.total,
        totalPages: Math.ceil(result.total / validated.pageSize),
      },
    };
  }

  getExports(): MonitoringExportEntryDto[] {
    return this.repo.getExportEntries();
  }
}

export async function getPlatformAdminMonitoringOverview(): Promise<MonitoringOverviewDto> {
  const service = new PlatformAdminMonitoringService(
    new PlatformAdminMonitoringRepository(prisma),
  );
  return service.getOverview();
}

export async function getPlatformAdminMonitoringUsers(
  query: MonitoringUsersQuery,
): Promise<MonitoringUsersListResponse> {
  const service = new PlatformAdminMonitoringService(
    new PlatformAdminMonitoringRepository(prisma),
  );
  return service.getUsers(query);
}

export async function getPlatformAdminMonitoringOrganizations(
  query: MonitoringOrganizationsQuery,
): Promise<MonitoringOrganizationsListResponse> {
  const service = new PlatformAdminMonitoringService(
    new PlatformAdminMonitoringRepository(prisma),
  );
  return service.getOrganizations(query);
}

export async function getPlatformAdminMonitoringAudit(
  query: MonitoringAuditQuery,
): Promise<MonitoringAuditListResponse> {
  const service = new PlatformAdminMonitoringService(
    new PlatformAdminMonitoringRepository(prisma),
  );
  return service.getAudit(query);
}

export function getPlatformAdminMonitoringExports(): MonitoringExportEntryDto[] {
  const service = new PlatformAdminMonitoringService(
    new PlatformAdminMonitoringRepository(prisma),
  );
  return service.getExports();
}
