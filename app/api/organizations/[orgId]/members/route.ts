import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { getMembers, OrganizationsApiError } from "@/features/organizations/server";

export async function GET(
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

    const members = await getMembers(requestedOrgId);

    return NextResponse.json({
      members,
    });
  } catch (error) {
    if (error instanceof OrganizationsApiError) {
      return NextResponse.json(error.responseBody, { status: error.status });
    }

    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
