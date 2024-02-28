/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Returns a single UGC', [
    { name: 'userGeneratedContents' },
  ]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC to return'),
  ];

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaArray(
        libs.make.schemaRef('schemas', 'userGeneratedContents') // @TODO Not the exact output, some parameters are filters, others are filled from other databases, like user. Fix me.
      )
    ),
    500: libs.make.responseError(
      'May be a server or client input error, check error message'
    ),
  };

  const path = '/userGeneratedContents/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
