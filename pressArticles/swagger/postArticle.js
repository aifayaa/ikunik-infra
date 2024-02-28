/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const post = libs.make.method('Creates a new article and a linked draft', [
    { name: 'pressArticles' },
  ]);

  post.parameters = [
    libs.make.param(
      'autoPublish',
      'query',
      'boolean',
      false,
      'Publish this article now'
    ),
    libs.make.param(
      'sendNotifications',
      'query',
      'integer',
      false,
      'If autoPublish is true, send notifications right now too'
    ),
  ];

  post.requestBody = libs.make.requestBody(
    'This is the whole request body',
    true,
    libs.make.schemaObject({
      actions: libs.make.outParam('An array of actions', 'string', false, {
        example: [],
      }),
      categoryId: libs.make.outParam(
        'The category in which to put this article',
        'string',
        true
      ),
      feedPicture: libs.make.outParam(
        'The article image to show in the news feed',
        'string',
        false
      ),
      md: libs.make.outParam(
        'The article content, in markdown syntax',
        'string',
        true
      ),
      pictures: libs.make.schemaArray(
        libs.make.outParam('Picture ID', 'string', false, {
          example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
        }),
        { description: 'An array of Ppcture IDs' }
      ),
      summary: libs.make.outParam('A summary of this article', 'string', false),
      productId: libs.make.outParam(
        'The product ID (only used for in-app purchase)',
        'string',
        false
      ),
      title: libs.make.outParam('The article title', 'string', true),
      videos: libs.make.schemaArray(
        libs.make.outParam('Video ID', 'string', false, {
          example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
        }),
        { description: 'An array of video IDs' }
      ),
    })
  );

  post.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject({
        articleId: libs.make.outParam(
          'The newly created article ID',
          'string',
          true,
          { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
        ),
        draftId: libs.make.outParam(
          'The newly created draft ID',
          'string',
          true,
          { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
        ),
        productId: libs.make.outParam(
          'The reference of the product, only used for In App Purchase feature',
          'string',
          false,
          { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
        ),
        published: libs.make.outParam(
          'Set to true when the article was published',
          'boolean',
          false
        ),
        notificationSent: libs.make.outParam(
          'Set to true when the notification was sent',
          'boolean',
          false
        ),
      })
    ),
    403: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('Server error, not handled'),
  };

  if (!output.paths['/press/articles']) {
    output.paths['/press/articles'] = {};
  }
  output.paths['/press/articles'].post = post;
};
