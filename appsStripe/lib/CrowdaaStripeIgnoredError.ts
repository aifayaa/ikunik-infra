import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';

export class CrowdaaStripeIgnoredError extends CrowdaaError {
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
    super(type, code, message, options);

    this.name = 'CrowdaaStripeIgnoredError';
    this.type = type;
    this.code = code;
    this.message = message;
    this.httpCode = options?.httpCode ? options.httpCode : 200;
    this.details = options?.details ?? options?.details;
  }
}
