export default (libs, output) => {
  const method = libs.make.method('Searches the database for articles', [{ name: 'pressSearch' }]);

  method.parameters = [
    libs.make.param('text', 'query', 'string', true, 'The text to search (in titles only)'),
    libs.make.param('limit', 'query', 'integer', false, 'The maximum number of articles to return, for pagination', { example: 10 }),
    libs.make.param('skip', 'query', 'integer', false, 'The number of articles to skip, for pagination', { example: 0 }),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      articles: libs.make.schemaArray(libs.make.schemaObject({
        _id: libs.make.outParam('The article ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        actions: libs.make.outParam('An array of actions', 'string', false, { example: [] }),
        category: libs.make.schemaRef('schemas', 'collPressCategories'),
        categoryId: libs.make.outParam('The category ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        createdAt: libs.make.outParam('The article creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
        permissions: libs.make.outParam('Article permissions', 'object', true),
        pictures: libs.make.schemaArray(libs.make.schemaRef('schemas', 'collPictures')),
        publicationDate: libs.make.outParam('The article publication date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
        publishedBy: libs.make.outParam('The user ID of the account that published this article', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        storeProductId: libs.make.outParam('The store product ID, if any', 'string', false, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        summary: libs.make.outParam('A summary of this article', 'string', false),
        text: libs.make.outParam('The article content, as HTML', 'string', true, { example: 'My article' }),
        title: libs.make.outParam('The article title', 'string', true, { example: '<p>example</p>' }),
        user: libs.make.outParam('The author user ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      })),
      total: libs.make.outParam('The number of returned articles', 'integer', true),
    })),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/search';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
