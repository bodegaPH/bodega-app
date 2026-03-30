import { z } from "zod";
import { MembershipRole } from "@prisma/client";
import { AccountApiError } from "@/features/account/server";
import { ItemApiError as ItemsApiError } from "@/features/items/server";
import { LocationApiError as LocationsApiError } from "@/features/locations/server";
import { MovementApiError as MovementsApiError } from "@/features/movements/server";
import { OrganizationsApiError as OrgsApiError } from "@/features/organizations/server";
import { requireAuthWithOrg } from "@/lib/api-auth";
import { apiError } from "@/lib/api-errors";

type AuthSuccess = Extract<
  Awaited<ReturnType<typeof requireAuthWithOrg>>,
  { success: true }
>;

type InferBody<TSchema extends z.ZodTypeAny | undefined> =
  TSchema extends z.ZodTypeAny ? z.infer<TSchema> : undefined;

export interface WithAuthOptions<TSchema extends z.ZodTypeAny | undefined = undefined> {
  allowedRoles?: MembershipRole[];
  bodySchema?: TSchema;
}

export interface WithAuthContext<TSchema extends z.ZodTypeAny | undefined = undefined> {
  request: Request;
  auth: AuthSuccess;
  body: InferBody<TSchema>;
}

function requiresJsonBody(method: string) {
  return method === "POST" || method === "PATCH" || method === "PUT";
}

export function validateJsonContentType(request: Request) {
  if (!requiresJsonBody(request.method)) {
    return null;
  }

  const contentType = request.headers.get("content-type");
  if (!contentType?.toLowerCase().includes("application/json")) {
    return apiError("Content-Type must be application/json", 415);
  }

  return null;
}

export function handleApiError(error: unknown) {
  if (
    error instanceof ItemsApiError ||
    error instanceof LocationsApiError ||
    error instanceof MovementsApiError ||
    error instanceof AccountApiError
  ) {
    return apiError(error.message, error.status);
  }

  if (error instanceof OrgsApiError) {
    const { error: message, ...details } = error.responseBody;
    return apiError(
      typeof message === "string" ? message : "Organizations API error",
      error.status,
      {
        details: Object.keys(details).length > 0 ? details : undefined,
      }
    );
  }

  console.error("Unhandled API error:", error);
  return apiError("Internal server error", 500);
}

/**
 * Wrapper for org-scoped API routes.
 * Future route migrations should prefer this over hand-rolled auth/body/error handling.
 */
export function withAuth<TSchema extends z.ZodTypeAny | undefined = undefined>(
  handler: (context: WithAuthContext<TSchema>) => Promise<Response>,
  options: WithAuthOptions<TSchema> = {}
) {
  return async function wrapped(request: Request) {
    const auth = await requireAuthWithOrg({ allowedRoles: options.allowedRoles });
    if (!auth.success) {
      return auth.response;
    }

    let parsedBody: InferBody<TSchema> = undefined as InferBody<TSchema>;

    if (options.bodySchema) {
      const contentTypeError = validateJsonContentType(request);
      if (contentTypeError) {
        return contentTypeError;
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return apiError("Invalid JSON body", 400);
      }

      const validation = options.bodySchema.safeParse(body);
      if (!validation.success) {
        return apiError("Validation failed", 400, {
          code: "VALIDATION_ERROR",
          details: validation.error.flatten(),
        });
      }

      parsedBody = validation.data as InferBody<TSchema>;
    }

    try {
      return await handler({ request, auth, body: parsedBody });
    } catch (error) {
      return handleApiError(error);
    }
  };
}
