export default (libs, output) => {
  const handler = {
    post: libs.make.method('Create an account'),
  };

  handler.post.parameters = [
    libs.make.paramBody('bodyParams', 'This is the whole request body', true, libs.make.schemaObject({
      email: libs.make.outParam('The email of the account to create', 'string', true),
      username: libs.make.outParam('The username of the account to create', 'string', true),
      password: libs.make.outParam('The password of this account', 'string', true),
    })),
  ];

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      success: libs.make.outParam('A static "success" string', 'string', true, { example: 'success' }),
      data: libs.make.schemaObject({
        _id: libs.make.outParam('The user ID', 'string', true),
      }),
    })),
    400: libs.make.responseError('Invalid request'),
    403: libs.make.responseError('Not enough permissions'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/register'] = handler;
};
