import { ZodError } from 'zod';
import { CrowdaaError } from './CrowdaaError';
import { CrowdaaErrorWithErrorBody } from './CrowdaaErrorWithErrorBody.js';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from './errorCodes';
import { formatResponseBody } from './formatResponseBody';
import { formatValidationErrors } from './formatValidationErrors';

type reponseType = {
  headers?: Object;
  code?: number;
  body?: string | Object;
  message?: string;
  raw?: string;
};

/* eslint-disable import/no-relative-packages */
export default function response({
  headers = {},
  code = 500,
  body,
  message,
  raw,
}: reponseType) {
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
  const statusCode = typeof code === 'number' ? code : 500;

  return {
    statusCode,
    body: respBody,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      ...headers,
    },
  };
}

export function formatResponseError(exception: CrowdaaError) {
  const { type, code, message } = exception;
  return {
    type,
    code,
    message,
    details: exception.details || exception.stack,
  };
}

export function computeErrorContent(exception: unknown) {
  if (!isException(exception)) {
    const errorBody = formatResponseBody({
      errors: [
        {
          type: ERROR_TYPE_INTERNAL_EXCEPTION,
          code: UNMANAGED_EXCEPTION_CODE,
          message: JSON.stringify(exception),
        },
      ],
    });
    return { code: 200, body: errorBody };
  }

  if (
    exception instanceof ZodError ||
    exception.constructor.name === 'ZodError'
  ) {
    const errors = formatValidationErrors(exception);
    const errorBody = formatResponseBody({ errors });
    return { code: 200, body: errorBody };
  }

  if (
    exception instanceof CrowdaaError ||
    exception.constructor.name === 'CrowdaaError'
  ) {
    const crowdaaException = exception as CrowdaaError;
    const { httpCode, type, code, message } = crowdaaException;
    const errorBody = formatResponseBody({
      errors: [
        {
          type,
          code,
          message,
          details: crowdaaException.details || crowdaaException.stack,
        },
      ],
    });
    return { code: httpCode, body: errorBody };
  }

  if (
    exception instanceof CrowdaaErrorWithErrorBody ||
    exception.constructor.name === 'CrowdaaErrorWithErrorBody'
  ) {
    const crowdaaExceptionWithErrorBody =
      exception as CrowdaaErrorWithErrorBody;
    const { httpCode, errorBody } = crowdaaExceptionWithErrorBody;
    return { code: httpCode, body: errorBody };
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
  return { code: 200, body: errorBody };
}

function isException(exception: unknown | Error): exception is Error {
  return (exception as Error).message !== undefined;
}

export function isCrowdaaError(
  exception: unknown | CrowdaaError
): exception is CrowdaaError {
  return exception instanceof CrowdaaError;
}

export function handleException(exception: unknown) {
  console.error('handleException(): Received exception :', exception);
  if (exception instanceof Error) {
    console.error('handleException(): Exception stack :', exception.stack);
  }
  return response(computeErrorContent(exception));
}
