export default ({ code, message = 'Error', stack } = {}) => {
  // eslint-disable-next-line no-console
  console.error(
    'errorMessage(): Received exception message =',
    message,
    ', stack =',
    stack
  );

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
    case 'update_failed':
      errorCode = 400;
      break;
    case 'access_forbidden':
    case 'forbidden':
    case 'forbidden_user':
    case 'insufficient_user_rights':
    case 'token_already_sent':
    case 'token_expired':
    case 'cannot_modify_app':
    case 'cannot_delete_app':
    case 'user_already_exists':
      errorCode = 403;
      break;
    case 'content_not_found':
    case 'email_not_found':
    case 'app_not_found':
    case 'user_not_found':
    case 'organization_not_found':
      errorCode = 404;
      break;
    case 'already_exists':
      errorCode = 409;
      break;
    case 'not_implemented':
      errorCode = 501;
      break;
    case 'cannot_send_email':
    default:
      errorCode = 500;
      // eslint-disable-next-line no-console
      console.error(message);
      break;
  }

  return { code: code || errorCode, message };
};
