import type { MembershipRole } from "@/modules/organizations/types";

export type InvitationStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export type OrganizationInvitation = {
  id: string;
  orgId: string;
  inviterUserId: string;
  invitedEmail: string;
  role: MembershipRole;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  inviter?: {
    id: string;
    name: string | null;
    email: string | null;
  };
};

export type CreateInvitationInput = {
  orgId: string;
  inviterUserId: string;
  invitedEmail: string;
  role: MembershipRole;
};

export type CreateInvitationResult = {
  invitation: OrganizationInvitation;
  token: string;
  delivery: {
    status: "sent" | "simulated";
    provider: string;
    detail?: string;
  };
};

export type AcceptInvitationResult = {
  invitationId: string;
  orgId: string;
  role: MembershipRole;
  alreadyMember: boolean;
};

export type InviteRateLimitResult = {
  allowed: boolean;
  retryAfterSeconds?: number;
  scope?: "inviter" | "organization" | "email";
};
