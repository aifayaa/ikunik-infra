export default (libs, output) => {
  const method = libs.make.method('Lists reports about an UGC', [{ name: 'userGeneratedContents' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID to get reports about'),
    libs.make.param('limit', 'query', 'integer', true, 'The maximum number of reports to return'),
    libs.make.param('start', 'query', 'integer', true, 'The number of reports to skip, for pagination'),
    libs.make.param('countOnly', 'query', 'boolean', false, 'To return only the number of reports'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      totalCount: libs.make.outParam('The number of returned reports', 'integer', true),
      items: libs.make.schemaArray(
        libs.make.schemaRef('schemas', 'collUGCReports'),
        { required: false },
      ),
    })),
    400: libs.make.responseError('Invalid input'),
    404: libs.make.responseError('UGC not found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/userGeneratedContents/{id}/reports';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
