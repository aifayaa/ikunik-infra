export default (libs, output) => {
  const method = libs.make.method('Generates a new API token (must be already logged in)', [{ name: 'users' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The user ID. Must be your own user ID.'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.outParam('The generated API token', 'string', true)),
    403: libs.make.responseError('Forbidden'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/users/{id}/apiToken';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
