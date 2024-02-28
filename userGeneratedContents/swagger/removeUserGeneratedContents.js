/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Removes a given UGC', [
    { name: 'userGeneratedContents' },
  ]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID to remove'),
  ];

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.outParam('True for success', 'boolean', true)
    ),
    403: libs.make.responseError('Unauthorized'),
    404: libs.make.responseError('UGC not found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/userGeneratedContents/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].delete = method;
};
