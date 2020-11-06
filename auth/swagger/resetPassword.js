export default (libs, output) => {
  const handler = {
    post: libs.make.method('Resets a user password, providing a token sent by email and and a new password'),
  };

  handler.post.parameters = [
    libs.make.param('email', 'body', 'string', true),
    libs.make.param('token', 'body', 'string', true),
    libs.make.param('password', 'body', 'string', true),
  ];

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
