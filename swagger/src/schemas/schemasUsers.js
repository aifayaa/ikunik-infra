export default (libs, output) => {
  // @TODO Check if there are any missing fields that may be shared through the API
  output.components.schemas.users = libs.make.schemaObject({
    username: libs.make.outParam('The user name of the author', 'string', true, { example: 'Foo Bar' }),
    country: libs.make.outParam('The user country code', 'string', false, { example: 'CA' }),
    locale: libs.make.outParam('The user locale', 'string', false, { example: 'fr-CA' }),
    createdAt: libs.make.outParam('The user creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
    emails: libs.make.schemaArray(libs.make.schemaObject({
      address: libs.make.outParam('The user email address used for login', 'string', true),
      verified: libs.make.outParam('Whether this email address was verified', 'boolean', true),
    })),
    profile: libs.make.schemaObject({
      email: libs.make.outParam('The user email address', 'string', true),
      firstname: libs.make.outParam('The user first name', 'string', true),
      lastname: libs.make.outParam('The user last name', 'string', true),
      isSuperAdmin: libs.make.outParam('If the user is a super administrator', 'boolean', true),
      isUserPicture: libs.make.outParam('If the user has a profile picture', 'boolean', true),
      profileIsSetup: libs.make.outParam('If the user account is configured', 'boolean', false),
      username: libs.make.outParam('The nickname of the author', 'string', true, { example: 'Foo' }),
    }),
  }, { description: 'This schema lacks voluntarly some information, since they are never shared using the API' });
};
