export default (libs, output) => {
  const put = libs.make.method('Unpublish an article', [{ name: 'pressArticles' }]);

  put.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The article to unpublish', { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
  ];

  put.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      articleId: libs.make.outParam('The article ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    })),
    403: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/articles/{id}/unpublish';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].put = put;
};
