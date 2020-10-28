export default ({ code, message = 'Error' } = {}) => {
  let errorCode;
  switch (message) {
    case 'missing_argument':
    case 'missing_payload':
    case 'wrong_argument_type':
    case 'wrong_argument_value':
    case 'invalid_email_token':
      errorCode = 400;
      break;
    case 'insufficient_user_rights':
    case 'access_forbidden':
    case 'forbidden_user':
    case 'token_expired':
    case 'token_already_sent':
      errorCode = 403;
      break;
    case 'content_not_found':
    case 'email_not_found':
    case 'app_not_found':
      errorCode = 404;
      break;
    default:
      errorCode = 500;
      break;
  }
  return { code: code || errorCode, message };
};
