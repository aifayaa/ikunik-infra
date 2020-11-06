export default (libs, output) => {
  if (!output.definitions.customs.pressArticles) {
    output.definitions.customs.pressArticles = {};
  }

  output.definitions.customs.pressArticles.getArticles = libs.make.schemaObject({
    total: libs.make.outParam('The number of returned articles', 'integer', true, { example: 1 }),
    articles: libs.make.schemaArray(libs.make.schemaObject({
      _id: libs.make.outParam('The article ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      user: libs.make.schemaObject({
        username: libs.make.outParam('The user name of the author', 'string', true, { example: 'Foo Bar' }),
        profile: libs.make.schemaObject({
          email: libs.make.outParam('The user email address', 'boolean', true),
          isSuperAdmin: libs.make.outParam('If the user is a super administrator', 'boolean', true),
          isUserPicture: libs.make.outParam('If the user has a profile picture', 'boolean', true),
          profileIsSetup: libs.make.outParam('If the user account is configured', 'boolean', false),
          username: libs.make.outParam('The nickname of the author', 'string', true, { example: 'Foo' }),
        }),
      }),
      category: libs.make.schemaObject({
        _id: libs.make.outParam('The category ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        appIds: libs.make.schemaRef('fields', 'appIds'),
        color: libs.make.outParam('The category color, can be null', 'string', false, { example: '#07cafe' }),
        createdAt: libs.make.outParam('The category creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
        name: libs.make.outParam('The category name', 'string', true, { example: '#07cafe' }),
        order: libs.make.outParam('An order number, allowing to sort categories', 'integer', true, { example: 999 }),
        picture: libs.make.schemaArray({ type: 'array', example: [] }, { description: 'Pictures are extracted and put at the root of this object. This should be empty.' }),
      }),
      actions: libs.make.outParam('An array of actions', 'string', false, { example: [] }),
      categoryId: libs.make.outParam('The category ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      createdAt: libs.make.outParam('The article creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
      feedPicture: libs.make.outParam('The article image to show in the news feed, if any', 'string', false, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      permissions: libs.make.outParam('Always null', 'object', true),
      pictures: libs.make.schemaArray(libs.make.schemaRef('schemas', 'collPictures')),
      publicationDate: libs.make.outParam('The article publication date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
      publishedBy: libs.make.outParam('The user ID of the account that published this article', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      storeProductId: libs.make.outParam('The store product ID, if any', 'string', false, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
      summary: libs.make.outParam('A summary of this article', 'string', false),
      text: libs.make.outParam('The article content, as HTML', 'string', true, { example: 'My article' }),
      title: libs.make.outParam('The article title', 'string', true, { example: '<p>example</p>' }),
      videos: libs.make.outParam('An array of videos, if any', 'array', false, { example: [] }),
    }), { description: 'An array of all published and accessible articles found according to input parameters' }),
  });
};
