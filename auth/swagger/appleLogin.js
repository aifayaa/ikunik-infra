export default (libs, output) => {
  const handler = {
    post: libs.make.method('Login to crowdaa API using Apple authentication'),
  };

  handler.post.parameters = [
    libs.make.paramBody('app', 'Parameters', true, libs.make.schemaObject({
      authorizationCode: libs.make.outParam('The authorization code', 'string', true),
      identityToken: libs.make.outParam('The identity token', 'string', true),
      fullName: libs.make.outParam('The user full name', 'string', true),
    })),
  ];

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      userId: libs.make.outParam('The user ID', 'string', true),
      authToken: libs.make.outParam('The user authentication token', 'string', true),
    })),
    400: libs.make.responseError('Invalid request'),
    401: libs.make.responseError('Invalid token'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/apple'] = handler;
};
