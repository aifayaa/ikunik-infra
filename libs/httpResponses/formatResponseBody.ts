type dataType = Object;
type errorsType = Array<{
  type: string;
  code: string;
  path?: string[];
  message: string;
  details: any;
}>;

/**
 * @param {Object} params
 * @param {Object} params.data - the data to return when no errors occurred
 * @param {{type: string, code: string, path?: string[], message: string, details: any}[]} params.errors - an array of errors
 * @param {string} params.errors[].type - ex: 'NotFound', 'InternalException', 'ValidationError' etc...
 * @param {string} params.errors[].code - ex: 'USER_NOT_FOUND' - can be used for i18n etc...
 * @param {string[]} params.errors[].path - the path to the validated field, ex: ['name']
 * @param {string} params.errors[].message - ex: 'User xxx not found.'
 * @param {unknown} params.errors[].details - contains additional detail about the error
 */
export const formatResponseBody = (params: {
  data?: dataType;
  errors?: errorsType;
}) => {
  const { data, errors } = params;

  let message;

  if (errors) {
    message = {
      status: 'error',
      errors: errors.map((error) => ({
        ...error,
        timestamp: new Date().toISOString(),
      })),
    };
  } else if (data) {
    message = {
      status: 'success',
      data,
    };
  }

  return message;
};
