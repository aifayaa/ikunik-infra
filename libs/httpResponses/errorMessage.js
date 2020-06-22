export default ({ message = 'Error' } = {}) => {
  let code;
  switch (message) {
    case 'missing_argument':
    case 'missing_payload':
    case 'wrong_argument_type':
    case 'wrong_argument_value':
      code = 400;
      break;
    case 'access_forbidden':
    case 'forbidden_user':
      code = 403;
      break;
    case 'content_not_found':
      code = 404;
      break;
    default:
      code = 500;
      break;
  }
  return { code, message };
};
