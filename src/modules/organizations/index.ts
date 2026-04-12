/**
 * Organizations Module - Public exports
 */
export {
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationOwner,
  getOrganizationName,
  validateMembershipForSwitch,
  getMembers,
  addMember,
  removeMember,
  updateMemberRole,
  transferOwnership,
  OrganizationsApiError,
} from "./service";

export type {
  OrganizationMember,
  OrganizationOwner,
  OrganizationDataCounts,
  UpdateOrganizationPayload,
  AddMemberPayload,
  DeleteOrganizationOptions,
  DeleteOrganizationResult,
  TransferOwnershipPayload,
  TransferOwnershipResult,
} from "./types";
