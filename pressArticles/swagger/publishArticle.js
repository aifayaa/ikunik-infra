/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const put = libs.make.method(
    'Publish an article draft (promotes it to an article)',
    [{ name: 'pressArticles' }]
  );

  put.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The article to publish', {
      example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
    }),
  ];

  put.requestBody = libs.make.requestBody(
    'This is the whole request body',
    true,
    libs.make.schemaObject({
      draftId: libs.make.outParam(
        'The article draft ID to publish',
        'string',
        true,
        { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
      ),
      date: libs.make.outParam(
        'The publication date, in a format that javascript Date() can parse',
        'string',
        true
      ),
      sendNotifications: libs.make.outParam(
        'Whether we should send notifications to users about this article',
        'boolean',
        false
      ),
    })
  );

  put.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject({
        articleId: libs.make.outParam('The article ID', 'string', true, {
          example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
        }),
        draftId: libs.make.outParam('The new draft ID', 'string', true, {
          example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
        }),
        notificationResults: libs.make.outParam(
          'Notifications statistics about sent notifications',
          'object',
          false
        ),
      })
    ),
    403: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/articles/{id}/publish';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].put = put;
};
