import type { MovementType, SystemRole } from "@prisma/client";

export interface MonitoringOverviewDto {
  lowStockCount: number;
  recentAdjustmentsCount: number;
  largeOutboundCount: number;
  orgCount: number;
  userCount: number;
}

export interface MonitoringUsersListRowDto {
  userId: string;
  email: string | null;
  name: string | null;
  systemRole: SystemRole;
  orgId: string;
  orgName: string;
  orgRole: "ORG_ADMIN" | "ORG_USER";
  joinedAt: string;
}

export interface MonitoringAuditRowDto {
  movementId: string;
  orgId: string;
  orgName: string;
  itemId: string;
  itemName: string;
  locationId: string;
  locationName: string;
  type: MovementType;
  quantity: string;
  reason: string | null;
  createdAt: string;
  actorUserId: string;
  actorEmail: string | null;
  actorName: string | null;
}

export interface MonitoringExportEntryDto {
  label: string;
  href: string;
  description: string;
}

export type MonitoringUsersSortField = "joinedAt" | "email";
export type MonitoringAuditSortField = "createdAt";
export type MonitoringSortOrder = "asc" | "desc";

export interface MonitoringUsersQuery {
  page?: number;
  pageSize?: number;
  orgId?: string;
  actorUserId?: string;
  systemRole?: SystemRole;
  sortBy?: MonitoringUsersSortField;
  sortOrder?: MonitoringSortOrder;
}

export interface MonitoringOrganizationsQuery {
  page?: number;
  pageSize?: number;
}

export interface MonitoringAuditQuery {
  page?: number;
  pageSize?: number;
  from?: Date;
  to?: Date;
  type?: MovementType;
  orgId?: string;
  itemId?: string;
  locationId?: string;
  sortBy?: MonitoringAuditSortField;
  sortOrder?: MonitoringSortOrder;
}

export interface MonitoringUsersListResponse {
  rows: MonitoringUsersListRowDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MonitoringAuditListResponse {
  rows: MonitoringAuditRowDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MonitoringOrganizationsListRowDto {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  memberCount: number;
}

export interface MonitoringOrganizationsListResponse {
  rows: MonitoringOrganizationsListRowDto[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface MonitoringUsersRepoQuery {
  page: number;
  pageSize: number;
  orgId?: string;
  actorUserId: string;
  systemRole?: SystemRole;
  sortBy: MonitoringUsersSortField;
  sortOrder: MonitoringSortOrder;
}

export interface MonitoringOrganizationsRepoQuery {
  page: number;
  pageSize: number;
}

export interface MonitoringAuditRepoQuery {
  page: number;
  pageSize: number;
  from: Date;
  to: Date;
  type?: MovementType;
  orgId?: string;
  itemId?: string;
  locationId?: string;
  sortBy: MonitoringAuditSortField;
  sortOrder: MonitoringSortOrder;
}
