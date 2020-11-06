export default (libs, output) => {
  const handler = {
    post: libs.make.method('Logout the currently logged in user'),
  };

  handler.post.parameters = [
    libs.make.param('X-Auth-Token', 'header', 'string', true, 'The user authentication token'),
    libs.make.param('X-User-Id', 'header', 'string', true, 'The user ID'),
  ];

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      success: libs.make.outParam('A static "success" string', 'string', true, { example: 'success' }),
      data: libs.make.schemaObject({
        message: libs.make.outParam('A static "You\'ve been logged out!" string', 'string', true, { example: 'You\'ve been logged out!' }),
      }),
    })),
    400: libs.make.responseError('Invalid request'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/logout'] = handler;
  output.paths['/auth/facebook/logout'] = handler;
};
