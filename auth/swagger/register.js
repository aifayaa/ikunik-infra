export default (libs, output) => {
  const handler = {
    post: libs.make.method('Create an account'),
  };

  handler.post.parameters = [
    libs.make.param('email', 'body', 'string', true),
    libs.make.param('username', 'body', 'string', true),
    libs.make.param('password', 'body', 'string', true),
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
