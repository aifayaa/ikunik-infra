export class CrowdaaError extends Error {
  constructor(type, code, message, { httpCode = null } = {}) {
    super(message);
    this.name = 'CrowdaaError';
    this.type = type;
    this.code = code;
    this.httpCode = httpCode || 200;
  }
}
