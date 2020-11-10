export default (libs, output) => {
  const method = libs.make.method('Reports a given UGC', [{ name: 'userGeneratedContents' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID to remove'),
  ];

  method.requestBody = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    details: libs.make.outParam('Explanation about this report, written by the user', 'string', true),
    reason: libs.make.outParam('The reason for this report, currently one possible value', 'string', false, { enum: ['inappropriate'] }),
  }));

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      _id: libs.make.outParam('The ID of this report', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      appIds: libs.make.schemaRef('schemas', 'fieldAppIds'),
      createdAt: libs.make.outParam('The creation date of this report', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
      details: libs.make.outParam('The report details', 'string', true),
      reason: libs.make.outParam('The report reason', 'string', true, { enum: ['inappropriate'] }),
      ugcId: libs.make.outParam('The reported UGC ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      userId: libs.make.outParam('The user who reported this', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    })),
    400: libs.make.responseError('Invalid input'),
    404: libs.make.responseError('UGC not found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/userGeneratedContents/{id}/report';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
