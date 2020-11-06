export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login using an OpenID account'),
  };

  handler.post.parameters = [
    libs.make.param('identityToken', 'body', 'string', true),
    libs.make.apiKeyParam(),
  ];

  handler.post.responses = {
    200: libs.make.responseObject('Success', {
      userId: libs.make.outParam('The user ID', 'string', true),
      authToken: libs.make.outParam('The user authentication token', 'string', true),
    }),
    400: libs.make.responseError('Invalid request'),
    403: libs.make.responseError('Not enough permissions'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/oidc'] = handler;
};
