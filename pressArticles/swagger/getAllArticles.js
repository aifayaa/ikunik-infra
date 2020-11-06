export default (libs, output) => {
  const handler = {
    post: libs.make.method('Get one or more press articles from the database'),
  };

  handler.post.parameters = [
    libs.make.paramBody('app', 'Parameters', true, libs.make.schemaObject({
      category: libs.make.outParam('The category ID to filter articles', 'string', true),
      start: libs.make.outParam('The offset of articles for this search', 'string', true),
      limit: libs.make.outParam('The maximum number of articles to return', 'string', true),
    })),
  ];

  handler.post.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('customs', 'pressArticles', 'getAllArticles')),
    500: libs.make.responseError('Server error, not handled'),
  };
  output.paths['/press/articlesAll/'] = handler;
};
