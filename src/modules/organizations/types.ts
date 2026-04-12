export type MembershipRole = "ORG_ADMIN" | "ORG_USER";

export type OrganizationOwner = {
  id: string;
  name: string | null;
  email: string | null;
};

export type OrganizationMember = {
  id: string;
  name: string | null;
  email: string | null;
  role: MembershipRole;
  isOwner: boolean;
};

export type OrganizationDataCounts = {
  items: number;
  locations: number;
  movements: number;
  stock: number;
};

export type UpdateOrganizationPayload = {
  name: string;
};

export type AddMemberPayload = {
  email: string;
  role?: MembershipRole;
};

export type DeleteOrganizationOptions = {
  requesterUserId: string;
  ownerConfirmation?: string;
};

export type DeleteOrganizationResult =
  | { deleted: true; nextOrgId: string }
  | { deleted: false; requiresConfirmation: true; details: OrganizationDataCounts };

export type TransferOwnershipPayload = {
  targetUserId: string;
  actorUserId: string;
};

export type TransferOwnershipResult = {
  organizationId: string;
  owner: OrganizationOwner;
};
