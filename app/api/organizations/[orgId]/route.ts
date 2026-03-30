import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import {
  deleteOrganization,
  OrganizationsApiError,
  updateOrganization,
} from "@/features/organizations/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN"] });
    if (!auth.success) return auth.response;

    const { orgId: activeOrgId } = auth;
    const { orgId: requestedOrgId } = await params;

    if (requestedOrgId !== activeOrgId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const updatedOrg = await updateOrganization(requestedOrgId, body);

    return NextResponse.json({
      message: "Organization updated successfully",
      organization: updatedOrg,
    });
  } catch (error) {
    if (error instanceof OrganizationsApiError) {
      return NextResponse.json(error.responseBody, { status: error.status });
    }

    console.error("Error updating organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN"] });
    if (!auth.success) return auth.response;

    const { orgId: activeOrgId, session } = auth;
    const { orgId: requestedOrgId } = await params;
    const userId = session.user.id;

    if (requestedOrgId !== activeOrgId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "true";

    const result = await deleteOrganization(requestedOrgId, {
      requesterUserId: userId,
      force,
    });

    if (!result.deleted) {
      return NextResponse.json(
        {
          error: "Organization has existing data",
          requiresConfirmation: true,
          details: result.details,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      message: "Organization deleted successfully",
      nextOrgId: result.nextOrgId,
    });
  } catch (error) {
    if (error instanceof OrganizationsApiError) {
      return NextResponse.json(error.responseBody, { status: error.status });
    }

    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
