export default (libs, output) => {
  const method = libs.make.method('Changes your user password, by providing your previous password', [{ name: 'auth' }]);

  method.requestBody = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    oldPassword: libs.make.outParam('The current password of the account', 'string', true),
    password: libs.make.outParam('The new password to set on this account', 'string', true),
  }));

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      message: libs.make.outParam('The "ok" string', 'string', true, { example: 'ok' }),
    })),
    400: libs.make.responseError('Invalid request'),
    403: libs.make.responseError('Not enough permissions'),
    404: libs.make.responseError('No data found according to api input'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/auth/changePassword';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
