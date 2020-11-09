export default (libs, output) => {
  const method = libs.make.method('Removes an article and all associated drafts');

  method.parameters = [
    libs.make.param('id', 'url', 'string', true, 'The article to remove', { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      articleId: libs.make.outParam('The removed article ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    })),
    403: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/articles/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].delete = method;
};
