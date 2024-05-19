export class CrowdaaError extends Error {
  type: string;
  code: string;
  message: string;
  httpCode: number;
  details: unknown;

  constructor(
    type: string,
    code: string,
    message: string,
    options?: { httpCode?: number; details?: unknown }
  ) {
    super(message);
    this.name = 'CrowdaaError';
    this.type = type;
    this.code = code;
    this.httpCode = options?.httpCode ? options.httpCode : 200;
    this.details = options?.details ?? options?.details;
  }
}
