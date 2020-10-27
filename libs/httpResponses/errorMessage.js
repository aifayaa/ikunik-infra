export default ({ code, message = 'Error' } = {}) => {
  let errorCode;
  switch (message) {
    case 'missing_argument':
    case 'missing_payload':
    case 'wrong_argument_type':
    case 'wrong_argument_value':
    case 'invalid_email_token':
    case 'invalid_password_length':
    case 'username_already_exists':
    case 'email_already_exists':
      errorCode = 400;
      break;
    case 'insufficient_user_rights':
    case 'access_forbidden':
    case 'forbidden_user':
      errorCode = 403;
      break;
    case 'content_not_found':
      errorCode = 404;
      break;
    default:
      errorCode = 500;
      break;
  }
  return { code: code || errorCode, message };
};
