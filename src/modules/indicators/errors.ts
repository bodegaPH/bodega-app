/**
 * Indicators Module - Error Definitions
 */

export class IndicatorsApiError extends Error {
  constructor(
    message: string,
    public code: string = "INDICATORS_ERROR"
  ) {
    super(message);
    this.name = "IndicatorsApiError";
  }
}
