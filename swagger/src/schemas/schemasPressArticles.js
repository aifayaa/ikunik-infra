export default (libs, output) => {
  output.components.schemas.pressArticles = libs.make.schemaObject({
    _id: libs.make.outParam('The article ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    userId: libs.make.outParam('The author user ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    categoryId: libs.make.outParam('The category ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    actions: libs.make.outParam('An array of actions', 'string', false, { example: [] }),
    appId: libs.make.schemaRef('schemas', 'fieldAppId'),
    createdAt: libs.make.outParam('The article creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
    feedPicture: libs.make.outParam('The article image to show in the news feed, if any', 'string', false, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    pictures: libs.make.schemaArray(libs.make.schemaRef('schemas', 'pictures')),
    publicationDate: libs.make.outParam('The article publication date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
    publishedBy: libs.make.outParam('The user ID of the account that published this article', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    summary: libs.make.outParam('A summary of this article', 'string', false),
    plainText: libs.make.outParam('The article content, as plain text', 'string', true, { example: 'My article' }),
    text: libs.make.outParam('The article content, as HTML', 'string', true, { example: '<p>My article</p>' }),
    md: libs.make.outParam('The article content, as Markdown', 'string', true, { example: '**My article**' }),
    title: libs.make.outParam('The article title', 'string', true, { example: '<p>example</p>' }),
    videos: libs.make.outParam('An array of videos, if any', 'array', false, { example: [] }),
    draftId: libs.make.outParam('The draft ID this article was created from, in collection pressDrafts', 'string', false, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
  });
};
