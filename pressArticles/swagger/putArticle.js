export default (libs, output) => {
  const put = libs.make.method('Edit an article (creates a new draft internally)');

  put.parameters = [
    libs.make.paramBody('app', 'Parameters', true, libs.make.schemaObject({
      articleId: libs.make.outParam('The article to edit', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      actions: libs.make.outParam('An array of actions', 'string', false, { example: [] }),
      categoryId: libs.make.outParam('The category in which to put this article', 'string', true),
      feedPicture: libs.make.outParam('The article image to show in the news feed', 'string', false),
      md: libs.make.outParam('The article content, in markdown syntax', 'string', true),
      pictures: libs.make.outParam('An array of pictures IDs', 'array', false),
      summary: libs.make.outParam('A summary of this article', 'string', false),
      productId: libs.make.outParam('The product ID (only used for in-app purchase)', 'string', false),
      title: libs.make.outParam('The article title', 'string', true),
      videos: libs.make.outParam('An array of videos IDs', 'array', false),
    })),
  ];

  put.responses = {
    200: libs.make.response('Success', libs.make.schemaObject({
      articleId: libs.make.outParam('The article ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      draftId: libs.make.outParam('The new draft ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    })),
    403: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('Server error, not handled'),
  };

  if (!output.paths['/press/articles']) {
    output.paths['/press/articles'] = {};
  }
  output.paths['/press/articles'].put = put;
};
