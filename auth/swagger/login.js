export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login using an API account', [{ name: 'auth' }]),
  };

  handler.post.requestBody = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    email: libs.make.outParam('The email of the account to log in to', 'string', false),
    username: libs.make.outParam('The username of the account to log into (if no email was sent)', 'string', false),
    password: libs.make.outParam('The password of your account', 'string', true),
  }));

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
