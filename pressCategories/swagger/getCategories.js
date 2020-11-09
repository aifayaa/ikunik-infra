export default (libs, output) => {
  const method = libs.make.method('Gets all visible article categories (public API)');

  method.parameters = [];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('customs', 'pressArticles', 'getCategories')),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/categories';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
