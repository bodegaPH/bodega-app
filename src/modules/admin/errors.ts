export class PlatformAdminMonitoringApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "PlatformAdminMonitoringApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
