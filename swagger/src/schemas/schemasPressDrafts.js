export default (libs, output) => {
  output.components.schemas.pressDrafts = libs.make.schemaObject({
    _id: libs.make.outParam('The draft ID', 'string', true, {
      example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
    }),
    categoryId: libs.make.outParam('The category ID', 'string', true, {
      example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
    }),
    title: libs.make.outParam('The article title', 'string', true, {
      example: '<p>example</p>',
    }),
    summary: libs.make.outParam('A summary of this article', 'string', false),
    text: libs.make.outParam('The article content, as HTML', 'string', true, {
      example: '<p>My article</p>',
    }),
    md: libs.make.outParam('The article content, as Markdown', 'string', true, {
      example: '**My article**',
    }),
    userId: libs.make.outParam('The author user ID', 'string', true, {
      example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
    }),
    isPublished: libs.make.outParam(
      'The article ID, only when this was published at least once',
      'string',
      false,
      { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
    ),
    ancestor: libs.make.outParam(
      'The ID of the previous draft, if any',
      'string',
      false,
      { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
    ),
    appId: libs.make.schemaRef('schemas', 'fieldAppId'),
    plainText: libs.make.outParam(
      'The article content, as plain text',
      'string',
      true,
      { example: 'My article' }
    ),
    videos: libs.make.outParam('An array of videos, if any', 'array', false, {
      example: [],
    }),
    createdAt: libs.make.outParam('The article creation date', 'string', true, {
      example: '1970-12-31T23:59:59.000Z',
    }),
    feedPicture: libs.make.outParam(
      'The article image to show in the news feed, if any',
      'string',
      false,
      { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
    ),
    pictures: libs.make.schemaArray(libs.make.schemaRef('schemas', 'pictures')),
    publicationDate: libs.make.outParam(
      'The article publication date, if any',
      'string',
      false,
      { example: '1970-12-31T23:59:59.000Z' }
    ),
    publishedBy: libs.make.outParam(
      'The user ID of the account that published this article, if any',
      'string',
      false,
      { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
    ),
  });
};
