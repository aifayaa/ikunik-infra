/* eslint-disable import/no-extraneous-dependencies */
import { ZodError, ZodIssueCode } from 'zod';
import { ERROR_TYPE_VALIDATION_ERROR } from './errorCodes';
import response, { wrapperHandleException } from './response';
import { formatResponseBody } from './formatResponseBody';

export const VALIDATION_FAILED_CODE = 'VALIDATION_FAILED'; // default
export const INVALID_TYPE_CODE = 'INVALID_TYPE';
export const UNRECOGNIZED_KEYS_CODE = 'UNRECOGNIZED_KEYS';
export const INVALID_ENUM_VALUE_CODE = 'INVALID_ENUM_VALUE';
export const INVALID_ARGUMENTS_CODE = 'INVALID_ARGUMENTS';
export const INVALID_DATE_CODE = 'INVALID_DATE';
export const INVALID_STRING_CODE = 'INVALID_STRING';
export const TOO_SMALL_CODE = 'TOO_SMALL';
export const TOO_BIG_CODE = 'TOO_BIG';
export const NOT_MULTIPLE_OF_CODE = 'NOT_MULTIPLE_OF';
export const CUSTOM_CODE = 'CUSTOM_CODE';

export type formatValidationErrorsType = {
  type: string;
  code: string;
  message: string;
  path?: (string | number)[];
  details?: Object;
};

// TODO: Should directly return a response
// -> Refactor every call to this handler
/**
 * See https://github.com/colinhacks/zod/blob/master/ERROR_HANDLING.md
 * for error details
 *
 * @param {ZodError} zodError
 */
function formatValidationErrorsAux(
  zodError: Error
): Array<formatValidationErrorsType> {
  if (!(zodError instanceof ZodError)) {
    return [
      {
        type: ERROR_TYPE_VALIDATION_ERROR,
        code: VALIDATION_FAILED_CODE,
        message: zodError.message,
      },
    ];
  }

  const formattedErrors = zodError.issues.map((issue) => {
    let code;
    let details: Object = {};

    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        code = INVALID_TYPE_CODE;
        details = {
          expected: issue.expected,
          received: issue.received,
        };
        break;

      case ZodIssueCode.unrecognized_keys:
        code = UNRECOGNIZED_KEYS_CODE;
        details = {
          keys: issue.keys,
        };
        break;

      // TODO handle and test this case
      // case ZodIssueCode.invalid_union:
      //   for (const err of issue.unionErrors) {
      //     formattedErrors(err);
      //   }
      //   break;

      case ZodIssueCode.invalid_enum_value:
        code = INVALID_ENUM_VALUE_CODE;
        details = {
          options: issue.options,
        };
        break;

      // TODO handle and test this case
      // case ZodIssueCode.invalid_arguments:
      //   code = INVALID_ARGUMENTS_CODE;
      //   break;

      case ZodIssueCode.invalid_date:
        code = INVALID_DATE_CODE;
        break;

      case ZodIssueCode.invalid_string:
        code = INVALID_STRING_CODE;
        details = {
          validation: issue.validation,
        };
        break;

      case ZodIssueCode.too_small:
        code = TOO_SMALL_CODE;
        details = {
          type: issue.type,
          minimum: issue.minimum,
          inclusive: issue.inclusive,
          exact: issue.exact,
        };
        break;

      case ZodIssueCode.too_big:
        code = TOO_BIG_CODE;
        details = {
          type: issue.type,
          maximum: issue.maximum,
          inclusive: issue.inclusive,
          exact: issue.exact,
        };
        break;

      case ZodIssueCode.not_multiple_of:
        code = NOT_MULTIPLE_OF_CODE;
        details = {
          multipleOf: issue.multipleOf,
        };
        break;

      case ZodIssueCode.custom:
        code = CUSTOM_CODE;
        break;

      default:
        code = VALIDATION_FAILED_CODE;
        break;
    }

    return {
      type: ERROR_TYPE_VALIDATION_ERROR,
      code,
      path: issue.path,
      message: issue.message,
      details,
    };
  });

  return formattedErrors;
}

export function formatValidationErrorsResponse(zodError: Error) {
  const errors = formatValidationErrorsAux(zodError);
  const errorBody = formatResponseBody({ errors });
  return response({ code: 200, body: errorBody });
}

export function formatValidationErrors(exception: unknown) {
  return wrapperHandleException(exception, formatValidationErrorsResponse);
}
