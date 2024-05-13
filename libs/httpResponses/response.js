import { CrowdaaError } from './CrowdaaError';
import { CrowdaaErrorWithErrorBody } from './CrowdaaErrorWithErrorBody';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from './errorCodes';
import { formatResponseBody } from './formatResponseBody';

/* eslint-disable import/no-relative-packages */
export default function response({ headers = {}, code, body, message, raw }) {
  if (!body && !message) {
    message = 'http_error_missing_response_arguments';
  }
  let respBody;

  if (body) {
    if (raw) {
      respBody = body;
    } else {
      respBody = typeof body === 'string' ? { message: body } : body;
      respBody = JSON.stringify(respBody);
    }
  } else {
    respBody = JSON.stringify({ message });
  }

  return {
    statusCode: code || 500,
    body: respBody,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers,
    },
  };
}

export function handleException(exception) {
  if (exception instanceof CrowdaaError) {
    const { type, code, message } = exception;
    const errorBody = formatResponseBody({
      errors: [
        {
          type,
          code,
          message,
          details: exception.details || exception.stack,
        },
      ],
    });
    return response({ code: 200, body: errorBody });
  }

  if (exception instanceof CrowdaaErrorWithErrorBody) {
    const { errorBody } = exception;
    return response({ code: 200, body: errorBody });
  }

  const errorBody = formatResponseBody({
    errors: [
      {
        type: ERROR_TYPE_INTERNAL_EXCEPTION,
        code: UNMANAGED_EXCEPTION_CODE,
        message: exception.message,
        details: exception.stack,
      },
    ],
  });
  return response({ code: 200, body: errorBody });
}
