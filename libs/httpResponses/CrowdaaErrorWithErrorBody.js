export class CrowdaaErrorWithErrorBody extends Error {
  constructor(errorBody, { httpCode = null } = {}) {
    super('Several error messages');
    this.name = 'CrowdaaErrorWithErrorBody';
    this.errorBody = errorBody;
    this.httpCode = httpCode || 200;
  }
}
