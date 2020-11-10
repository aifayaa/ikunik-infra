export default (libs, output) => {
  const method = libs.make.method('Returns profile data about your user', [{ name: 'users' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The user ID. Must be your own user ID.'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({ // @TODO Fill me
      username: libs.make.outParam('The username', 'string', true),
      email: libs.make.outParam('Email address', 'string', false, { example: 'test@te.st' }),
      first_name: libs.make.outParam('The user first name', 'string', false),
      last_name: libs.make.outParam('The user last name', 'string', false),
      avatar: libs.make.outParam('The user avatar link', 'string', false),
      language: libs.make.outParam('The user language', 'string', false),
      phone: libs.make.outParam('The user phone number', 'string', false),
    }, { description: 'User profile data object. This schema is not complete and most fields are optionnals' })),
    403: libs.make.responseError('Forbidden'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/users/{id}/profile';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
