# Invite / Export Hardening Runbook

## Operational triggers

- **Invite error spike**: sustained `INVITE_DELIVERY_FAILED` or `INVITE_PROVIDER_NOT_CONFIGURED` responses.
- **Invite abuse protection**: repeated `INVITE_RATE_LIMITED` across same org or inviter.
- **Export saturation**: repeated `RATE_LIMITED` or `EXPORT_CAP_EXCEEDED` responses.

## Triage metadata

For invite/export API responses, use:

- `requestId`
- `supportCode`
- `retryAfterSeconds` (when present)

Match with structured logs (`[op-event]`) fields:

- `requestId`
- `orgId`
- `actorUserId`
- `event`
- `result`
- `errorCode`
- `durationMs`

## Recommended thresholds

- **Invite provider incidents**: >5 delivery failures in 5 minutes for one org.
- **Invite rate-limit incidents**: >20 rate-limited attempts in 10 minutes for one org.
- **Export cap incidents**: >10 cap exceed responses in 10 minutes for one org.
- **Export rate-limit incidents**: >30 rate-limited export responses in 10 minutes across tenant.

## Immediate actions

1. Capture `requestId` + `supportCode` from user report.
2. Locate matching `[op-event]` log entries by `requestId`.
3. Verify if issue is:
   - provider/config (`INVITE_PROVIDER_NOT_CONFIGURED`),
   - upstream delivery (`INVITE_DELIVERY_FAILED`),
   - abuse/rate pressure (`INVITE_RATE_LIMITED` / `RATE_LIMITED`),
   - dataset scope (`EXPORT_CAP_EXCEEDED`).
4. For rate-limited flows, communicate `retryAfterSeconds` guidance to users.
5. For repeated export cap failures, advise narrower filters/date range.

## Notes

- Invite create/resend idempotency records are short-window and suppress duplicate side effects.
- Export throttling is enforced both in-memory (fast path) and durable DB-backed windows.
