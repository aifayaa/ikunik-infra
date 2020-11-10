export default (libs, output) => {
  const method = libs.make.method('Reviews a given UGC report', [{ name: 'userGeneratedContents' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID to report'),
  ];

  method.requestBody = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    moderated: libs.make.outParam('True to accept the report and hide this UGC, false otherwise', 'boolean', true),
    reason: libs.make.outParam('The reason for this decision', 'string', true),
  }));

  method.responses = {
    200: libs.make.response('Success', libs.make.outParam('True for success', 'boolean', true)),
    400: libs.make.responseError('Invalid input'),
    404: libs.make.responseError('UGC not found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/userGeneratedContents/{id}/review';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].patch = method;
};
