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
    const auth = await requireAuthWithOrg();
    if (!auth.success) return auth.response;

    const { orgId: activeOrgId, orgRole } = auth;
    const { orgId: requestedOrgId } = await params;

    if (requestedOrgId !== activeOrgId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    if (orgRole !== "ORG_ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
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
    const auth = await requireAuthWithOrg();
    if (!auth.success) return auth.response;

    const { orgId: activeOrgId, orgRole, session } = auth;
    const { orgId: requestedOrgId } = await params;
    const userId = (session.user as any).id;

    if (requestedOrgId !== activeOrgId) {
      return NextResponse.json(
        { error: "Not found" },
        { status: 404 }
      );
    }

    if (orgRole !== "ORG_ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
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
