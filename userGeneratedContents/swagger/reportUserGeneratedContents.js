/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Reports a given UGC', [
    { name: 'userGeneratedContents' },
  ]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID to report'),
  ];

  method.requestBody = libs.make.requestBody(
    'This is the whole request body',
    true,
    libs.make.schemaObject({
      details: libs.make.outParam(
        'Explanation about this report, written by the user',
        'string',
        true
      ),
      reason: libs.make.outParam(
        'The reason for this report, currently one possible value',
        'string',
        false,
        { enum: ['inappropriate'] }
      ),
    })
  );

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaRef('schemas', 'ugcReports')
    ),
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
