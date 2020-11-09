export default (libs, output) => {
  const handler = {
    post: libs.make.method('Resets a user password, providing a token sent by email and and a new password', [{ name: 'auth' }]),
  };

  handler.post.parameters = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    email: libs.make.outParam('The email of the account to reset password', 'string', true),
    token: libs.make.outParam('The token that was sent by email', 'string', true),
    password: libs.make.outParam('The new password of this account', 'string', true),
  }));

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      email: libs.make.outParam('The sent email', 'string', true),
      message: libs.make.outParam('The "ok" string', 'string', true, { example: 'ok' }),
    })),
    400: libs.make.responseError('Invalid request'),
    403: libs.make.responseError('Not enough permissions'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/resetPassword'] = handler;
};
