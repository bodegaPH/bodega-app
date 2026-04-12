import { NextRequest, NextResponse } from "next/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import {
  addMember,
  getMembers,
  OrganizationsApiError,
  removeMember,
  updateMemberRole,
} from "@/features/organizations/server";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN"] });
    if (!auth.success) return auth.response;

    const { orgId: activeOrgId } = auth;
    const { orgId: requestedOrgId } = await params;

    if (requestedOrgId !== activeOrgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isRecord(body) || typeof body.email !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const role = body.role === "ORG_ADMIN" ? "ORG_ADMIN" : "ORG_USER";
    const member = await addMember(requestedOrgId, { email: body.email, role });

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof OrganizationsApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isRecord(body) || typeof body.userId !== "string" || typeof body.role !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const member = await updateMemberRole(
      requestedOrgId,
      body.userId,
      body.role === "ORG_ADMIN" ? "ORG_ADMIN" : "ORG_USER"
    );

    return NextResponse.json({ member });
  } catch (error) {
    if (error instanceof OrganizationsApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const auth = await requireAuthWithOrg({ allowedRoles: ["ORG_ADMIN"] });
    if (!auth.success) return auth.response;

    const { orgId: activeOrgId } = auth;
    const { orgId: requestedOrgId } = await params;

    if (requestedOrgId !== activeOrgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!isRecord(body) || typeof body.userId !== "string") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    await removeMember(requestedOrgId, body.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OrganizationsApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
