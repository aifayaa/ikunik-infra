import { CrowdaaError } from './CrowdaaError';
import { ERROR_TYPE_VALIDATION_ERROR, MISSING_BODY_CODE } from './errorCodes';

export function checkBodyIsPresent(body: string | null) {
  if (!body) {
    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      MISSING_BODY_CODE,
      `Body is missing in the request`
    );
  }

  return body;
}
