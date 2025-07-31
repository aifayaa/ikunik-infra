import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_VALIDATION_ERROR,
  MISSING_BODY_CODE,
} from '@libs/httpResponses/errorCodes';
import { z } from 'zod';

export function parseAPIRequestBody<T>(
  schema: z.ZodSchema<T>,
  body: string | null
) {
  if (!body) {
    throw new CrowdaaError(
      ERROR_TYPE_VALIDATION_ERROR,
      MISSING_BODY_CODE,
      'Body is missing from the request'
    );
  }

  const ret = schema.parse(JSON.parse(body));

  return ret;
}
