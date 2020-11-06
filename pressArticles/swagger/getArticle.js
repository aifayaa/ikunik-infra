export default (libs, output) => {
  const handler = {
    get: libs.make.method('Get one article by ID'),
  };

  handler.get.parameters = [
    libs.make.param('id', 'url', 'string', true, 'The article ID to return'),
  ];

  handler.get.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('customs', 'pressArticles', 'getArticle')),
    404: libs.make.responseError('No article found at this ID'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/press/articles/{id}'] = handler;
};
