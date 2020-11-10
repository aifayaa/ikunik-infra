export default (libs, output) => {
  const method = libs.make.method('Get our current app settings', [{ name: 'apps' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The app ID'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      name: libs.make.outParam('The Crowdaa app name', 'string', true),
      protocol: libs.make.outParam('The Crowdaa scheme (used to run the app and launch specific tasks from links)', 'string', true),
      key: libs.make.outParam('The app key (only returned when proper permissions are set', 'string', false),
    })),
    404: libs.make.responseError('No app found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/apps/{id}/infos';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
