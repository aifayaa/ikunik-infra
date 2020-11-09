export default (libs, output) => {
  const handler = {
    post: libs.make.method('Ask to reset the password of the given user, identified by his email & app ID pair'),
  };

  handler.post.parameters = [
    libs.make.paramBody('bodyParams', 'This is the whole request body', true, libs.make.schemaObject({
      email: libs.make.outParam('The email of the account to recover', 'string', true),
    })),
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

  output.paths['/auth/forgotPassword'] = handler;
};
