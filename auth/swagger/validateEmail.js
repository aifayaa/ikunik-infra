export default (libs, output) => {
  const handler = {
    post: libs.make.method('Marks an email address of an account as validated in database', [{ name: 'auth' }]),
  };

  handler.post.parameters = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    email: libs.make.outParam('The email of the account to validate', 'string', true),
    token: libs.make.outParam('The token that was sent by email', 'string', true),
  }));

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      status: libs.make.outParam('The "success" string', 'string', true, { example: 'success' }),
    })),
    400: libs.make.responseError('Invalid request'),
    403: libs.make.responseError('Not enough permissions'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/validateEmail'] = handler;
};
