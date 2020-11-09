export default (libs, output) => {
  const handler = {
    get: libs.make.method('Get one or more press articles from the database, published or not'),
  };

  handler.get.parameters = [
    libs.make.param('category', 'query', 'string', true, 'The category ID to filter articles'),
    libs.make.param('start', 'query', 'integer', true, 'The offset of articles for this search'),
    libs.make.param('limit', 'query', 'integer', true, 'The maximum number of articles to return'),
  ];

  handler.get.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('responses', 'pressArticles', 'getAllArticles')),
    500: libs.make.responseError('Server error, not handled'),
  };
  output.paths['/press/articlesAll/'] = handler;
};
