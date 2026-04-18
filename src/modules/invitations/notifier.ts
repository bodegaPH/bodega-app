import type { MembershipRole } from "@/modules/organizations/types";

export type InvitationDeliveryStatus = "sent" | "simulated";

export type InvitationDeliveryResult = {
  status: InvitationDeliveryStatus;
  provider: string;
  detail?: string;
};

export type InvitationNotificationPayload = {
  invitationId: string;
  orgId: string;
  inviterUserId: string;
  invitedEmail: string;
  role: MembershipRole;
  token: string;
  expiresAt: Date;
  requestId?: string;
};

export interface InvitationNotifier {
  notifyInvitation(payload: InvitationNotificationPayload): Promise<InvitationDeliveryResult>;
}

interface MailjetMessageError {
  ErrorIdentifier?: string;
  ErrorCode?: string;
  StatusCode?: number;
  ErrorMessage?: string;
}

const MAILJET_TIMEOUT_MS = 10_000;

class DevInvitationNotifier implements InvitationNotifier {
  async notifyInvitation(payload: InvitationNotificationPayload): Promise<InvitationDeliveryResult> {
    console.info("[invites] simulated delivery", {
      requestId: payload.requestId,
      invitationId: payload.invitationId,
      orgId: payload.orgId,
      invitedEmail: payload.invitedEmail,
      role: payload.role,
      token: payload.token,
      expiresAt: payload.expiresAt.toISOString(),
    });

    return {
      status: "simulated",
      provider: "dev-console",
      detail: "Delivery simulated in local/development mode",
    };
  }
}

class MailjetInvitationNotifier implements InvitationNotifier {
  async notifyInvitation(payload: InvitationNotificationPayload): Promise<InvitationDeliveryResult> {
    const apiKey = process.env.MAILJET_API_KEY?.trim();
    const apiSecret = process.env.MAILJET_API_SECRET?.trim();
    const fromEmail = process.env.MAILJET_FROM_EMAIL?.trim();
    const fromName = process.env.MAILJET_FROM_NAME?.trim() || "Bodega";
    const appBaseUrl = process.env.NEXTAUTH_URL?.trim();

    if (!apiKey || !apiSecret || !fromEmail || !appBaseUrl) {
      throw new Error("Mailjet provider is not configured");
    }

    const inviteUrl = new URL(`/invite/accept?token=${encodeURIComponent(payload.token)}`, appBaseUrl).toString();
    const expiresAtText = payload.expiresAt.toUTCString();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAILJET_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://api.mailjet.com/v3.1/send", {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Messages: [
            {
              From: { Email: fromEmail, Name: fromName },
              To: [{ Email: payload.invitedEmail }],
              Subject: "You were invited to join Bodega",
              TextPart: `You were invited to join an organization on Bodega as ${payload.role}. Accept invite: ${inviteUrl}. This invite expires at ${expiresAtText}.`,
              HTMLPart: `<p>You were invited to join an organization on <strong>Bodega</strong> as <strong>${payload.role}</strong>.</p><p><a href="${inviteUrl}">Accept invitation</a></p><p>This invite expires at ${expiresAtText}.</p>`,
              CustomID: payload.invitationId,
              Headers: payload.requestId
                ? {
                    "X-Request-Id": payload.requestId,
                  }
                : undefined,
            },
          ],
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Mailjet delivery failed: request timed out");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }

    let parsed: unknown = null;
    try {
      parsed = await response.json();
    } catch {
      parsed = null;
    }

    if (!response.ok) {
      const messageError = (parsed as { Messages?: Array<{ Errors?: MailjetMessageError[] }> })?.Messages?.[0]?.Errors?.[0];
      const reason =
        messageError?.ErrorMessage ||
        messageError?.ErrorIdentifier ||
        `Mailjet request failed with status ${response.status}`;
      throw new Error(`Mailjet delivery failed: ${reason}`);
    }

    return {
      status: "sent",
      provider: "mailjet",
    };
  }
}

export function getInvitationNotifier(): InvitationNotifier {
  const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
  const isProd = process.env.NODE_ENV === "production";

  if (provider === "mailjet") {
    if (
      !process.env.MAILJET_API_KEY?.trim() ||
      !process.env.MAILJET_API_SECRET?.trim() ||
      !process.env.MAILJET_FROM_EMAIL?.trim() ||
      !process.env.NEXTAUTH_URL?.trim()
    ) {
      throw new Error("Mailjet provider is not configured");
    }
    return new MailjetInvitationNotifier();
  }

  if (!isProd) {
    return new DevInvitationNotifier();
  }

  throw new Error("No invitation notifier provider configured for production");
}
