import { CrowdaaError } from './CrowdaaError';
import {
  ERROR_TYPE_INTERNAL_EXCEPTION,
  UNMANAGED_EXCEPTION_CODE,
} from './errorCodes';
import { formatValidationErrorsType } from './formatValidationErrors';

// From this answer:
// https://stackoverflow.com/questions/62158066/typescript-type-where-an-object-consists-of-exactly-a-single-property-of-a-set-o#answer-71131506
type Explode<T> = keyof T extends infer K
  ? K extends unknown
    ? { [I in keyof T]: I extends K ? T[I] : never }
    : never
  : never;
type AtMostOne<T> = Explode<Partial<T>>;
type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> &
  U[keyof U];
type ExactlyOne<T> = AtMostOne<T> & AtLeastOne<T>;

type returnErrorType = {
  status: string;
  errors: (formatValidationErrorsType & {
    timestamp: string;
  })[];
};
type returnSuccessType = {
  status: string;
  data: Object;
};
type returnType = returnErrorType | returnSuccessType;

/**
 * @param {Object} params
 * @param {Object} params.data - the data to return when no errors occurred
 * @param {Array<errorType>} params.errors - an array of errors
 * @param {string} params.errors[].type - ex: 'NotFound', 'InternalException', 'ValidationError' etc...
 * @param {string} params.errors[].code - ex: 'USER_NOT_FOUND' - can be used for i18n etc...
 * @param {string[]} params.errors[].path - the path to the validated field, ex: ['name']
 * @param {string} params.errors[].message - ex: 'User xxx not found.'
 * @param {unknown} params.errors[].details - contains additional detail about the error
 */
export function formatResponseBody(
  params: ExactlyOne<{
    data?: Object;
    errors?: Array<formatValidationErrorsType>;
  }>
): returnType {
  const { data, errors } = params;

  if (errors) {
    return {
      status: 'error',
      errors: errors.map((error) => ({
        ...error,
        timestamp: new Date().toISOString(),
      })),
    };
  }

  if (data) {
    return {
      status: 'success',
      data,
    };
  }

  throw new CrowdaaError(
    ERROR_TYPE_INTERNAL_EXCEPTION,
    UNMANAGED_EXCEPTION_CODE,
    `Neither data '${data}' or errors '${errors}' are defined`
  );
}
