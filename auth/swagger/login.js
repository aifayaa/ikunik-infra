export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login using an API account'),
  };

  handler.post.parameters = [
    libs.make.param('email', 'body', 'string', true),
    libs.make.param('username', 'body', 'string', true),
    libs.make.param('password', 'body', 'string', true),
  ];

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      success: libs.make.outParam('A static "success" string', 'string', true, { example: 'success' }),
      status: libs.make.schemaObject({
        userId: libs.make.outParam('The user ID', 'string', true),
        authToken: libs.make.outParam('The user authentication token', 'string', true),
      }),
    })),
    400: libs.make.responseError('Invalid request'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/login'] = handler;
};
