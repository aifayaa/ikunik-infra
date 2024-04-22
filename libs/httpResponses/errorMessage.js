/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-relative-packages */
import { ZodError } from 'zod';

export default ({ code, message = 'Error', error } = {}) => {
  let errorCode;
  switch (message) {
    case 'action_field_missing':
    case 'email_already_exists':
    case 'invalid_email_token':
    case 'invalid_password_length':
    case 'missing_argument':
    case 'missing_payload':
    case 'username_already_exists':
    case 'wrong_argument_type':
    case 'wrong_argument_value':
      errorCode = 400;
      break;
    case 'access_forbidden':
    case 'forbidden':
    case 'forbidden_user':
    case 'insufficient_user_rights':
    case 'token_already_sent':
    case 'token_expired':
      errorCode = 403;
      break;
    case 'content_not_found':
    case 'email_not_found':
    case 'app_not_found':
    case 'user_not_found':
      errorCode = 404;
      break;
    case 'cannot_send_email':
    default:
      errorCode = 500;
      // eslint-disable-next-line no-console
      console.error(message);
      break;
  }

  // for now, considering zod errors as validation errors
  if (error instanceof ZodError) {
    return { code: 422, message: error.flatten() };
  }

  return { code: code || errorCode, message };
};
