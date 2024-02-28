/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method(
    'Gets all visible article categories (public API)',
    [{ name: 'pressCategories' }]
  );

  method.parameters = [];

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaRef('responses', 'pressArticles', 'getCategories')
    ),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/categories';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
