export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login using an API account'),
  };

  handler.post.parameters = [
    libs.make.param('email', 'query', 'string', true),
    libs.make.param('username', 'query', 'string', true),
    libs.make.param('password', 'query', 'string', true),
    libs.make.apiKeyParam(),
  ];

  handler.post.responses = {
    200: libs.make.responseObject('Success', {
      success: libs.make.outParam('A static "success" string', 'string', true, { example: 'success' }),
      status: libs.make.schemaObject({
        userId: libs.make.outParam('The user ID', 'string', true),
        authToken: libs.make.outParam('The user authentication token', 'string', true),
      }),
    }),
    400: libs.make.responseError('Invalid request'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/login'] = handler;
};
