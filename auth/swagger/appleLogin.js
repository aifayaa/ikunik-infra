export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login to crowdaa API using Apple authentication'),
  };

  handler.post.parameters = [
    libs.make.param('authorizationCode', 'query', 'string', true),
    libs.make.param('identityToken', 'query', 'string', true),
    libs.make.param('fullName', 'query', 'string', true),
    libs.make.param('X-Api-Key', 'header', 'string', true),
  ];

  handler.post.responses = {
    200: libs.make.responseObject('Success', {
      userId: {
        description: 'The user id',
        type: 'string',
        required: true,
      },
      authToken: {
        description: 'The user authentication token',
        type: 'string',
        required: true,
      },
    }),
    400: libs.make.responseError('Invalid request'),
    401: libs.make.responseError('Invalid token'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/apple'] = handler;
};
