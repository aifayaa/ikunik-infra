export default (libs, output) => {
  const method = libs.make.method('Get an app builds', [{ name: 'apps' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The app ID'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
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
    })),
    404: libs.make.responseError('No app found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/apps/{id}/builds';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
