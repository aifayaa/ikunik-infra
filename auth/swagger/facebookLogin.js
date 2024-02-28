/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const handler = {
    post: libs.make.method(
      'Login to crowdaa API using Facebook authentication',
      [{ name: 'auth' }]
    ),
  };

  handler.post.requestBody = libs.make.requestBody(
    'This is the whole request body',
    true,
    libs.make.schemaObject({
      accessToken: libs.make.outParam(
        'The Facebook access token code',
        'string',
        true
      ),
    })
  );

  handler.post.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject({
        userId: libs.make.outParam('The user ID', 'string', true),
        authToken: libs.make.outParam(
          'The user authentication token',
          'string',
          true
        ),
      })
    ),
    400: libs.make.responseError('Invalid request'),
    401: libs.make.responseError('Invalid token'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/auth/facebook'] = handler;
};
