export default (libs, output) => {
  const method = libs.make.method('Returns public informations about a user', [{ name: 'users' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The user to return. Must be your own user ID.'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      country: libs.make.outParam('The country code, like "US"', 'string', true, { example: 'US' }),
      createdAt: libs.make.outParam('The creation date of this user', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
      emails: libs.make.schemaArray(
        libs.make.outParam('Email address', 'string', true, { example: 'test@te.st' }),
        { description: 'An array of email addresses for this user' },
      ),
      hasArtistProfile: libs.make.outParam('Outdated property', 'boolean', false),
      locale: libs.make.outParam('The locale of this user', 'string', true, { example: 'fr-CA' }),
      profile: libs.make.schemaObject({ // @TODO Fill me
        username: libs.make.outParam('The username', 'string', true),
        email: libs.make.outParam('Email address', 'string', false, { example: 'test@te.st' }),
        first_name: libs.make.outParam('The user first name', 'string', false),
        last_name: libs.make.outParam('The user last name', 'string', false),
        avatar: libs.make.outParam('The user avatar link', 'string', false),
        language: libs.make.outParam('The user language', 'string', false),
        phone: libs.make.outParam('The user phone number', 'string', false),
      }, { description: 'User profile data object. This schema is not complete and most fields are optionnals' }),
      username: libs.make.outParam('The username', 'string', true),
      optIn: libs.make.schemaArray(
        libs.make.outParam('The TOS ID', 'string', true),
        { description: 'What did the user opt in to (for Terms Of Services)' }, // @TODO Fill/update me if needed
      ),
      perms: libs.make.schemaObject({
        // @TODO Fill me
      }, { description: 'The user permissions. To be completed' }),
    })),
    403: libs.make.responseError('Forbidden'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/users/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
