export default (libs, output) => {
  const handler = {
    post: libs.make.method('Ask to reset the password of the given user, identified by his email & app ID pair'),
  };

  handler.post.parameters = [
    libs.make.param('email', 'body', 'string', true),
    libs.make.param('password', 'body', 'string', true),
    libs.make.apiKeyParam(),
  ];

  handler.post.responses = {
    200: libs.make.responseObject('Success', {
      status: libs.make.outParam('The "success" string', 'string', true, { example: 'success' }),
    }),
    400: libs.make.responseError('Invalid request'),
    403: libs.make.responseError('Not enough permissions'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/validateEmail'] = handler;
};
