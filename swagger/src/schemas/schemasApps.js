export default (libs, output) => {
  // @TODO Check if there are any missing fields that may be shared through the API
  output.components.schemas.apps = libs.make.schemaObject({
    name: libs.make.outParam('The Crowdaa app name', 'string', true),
    protocol: libs.make.outParam('The Crowdaa scheme (used to run the app and launch specific tasks from links)', 'string', true),
    key: libs.make.outParam('The app key (only returned when proper permissions are set', 'string', false),
    builds: libs.make.schemaObject({
      ios: libs.make.schemaObject({
        iosAppId: libs.make.outParam('The iOS app ID', 'string', true),
        packageId: libs.make.outParam('THe iOS PAckage ID', 'string', true),
        platform: libs.make.outParam('"ios"', 'string', true),
      }),
      android: libs.make.schemaObject({
        packageId: libs.make.outParam('The Android Package ID', 'string', true),
        platform: libs.make.outParam('"android"', 'string', true),
      }),
    }),
    settings: libs.make.schemaObject({
      public: libs.make.schemaObject({
        loginFacebook: libs.make.outParam('True to accept Facebook logins', 'boolean', true),
        loginInstagram: libs.make.outParam('True to accept Instagram logins', 'boolean', true),
        loginTwitter: libs.make.outParam('True to accept Twitter logins', 'boolean', true),
      }),
    }),
  }, { description: 'This schema lacks voluntarly some information, since they are never shared using the API' });
};
