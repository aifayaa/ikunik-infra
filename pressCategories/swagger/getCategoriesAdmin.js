export default (libs, output) => {
  const method = libs.make.method('Gets all article categories, including hidden ones', [{ name: 'pressCategories' }]);

  method.parameters = [];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('responses', 'pressArticles', 'getCategories')),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/admin/press/categories';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
