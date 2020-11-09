export default (libs, output) => {
  const method = libs.make.method('Gets a single category by ID');

  method.parameters = [
    libs.make.param('id', 'url', 'string', true, 'The article category ID to return'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('schemas', 'collPressCategories')),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/categories/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
