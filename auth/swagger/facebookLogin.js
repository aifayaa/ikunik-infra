export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login to crowdaa API using Facebook authentication'),
  };

  handler.post.parameters = [
    libs.make.param('accessToken', 'body', 'string', true),
    libs.make.apiKeyParam(),
  ];

  handler.post.responses = {
    200: libs.make.responseObject('Success', {
      userId: libs.make.outParam('The user ID', 'string', true),
      authToken: libs.make.outParam('The user authentication token', 'string', true),
    }),
    400: libs.make.responseError('Invalid request'),
    401: libs.make.responseError('Invalid token'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/facebook'] = handler;
};
