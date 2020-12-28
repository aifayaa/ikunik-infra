export default (libs, output) => {
  output.components.schemas.userGeneratedContents = libs.make.schemaObject({
    _id: libs.make.outParam('The UGC ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    parentId: libs.make.outParam('The parent UGC ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    parentCollection: libs.make.outParam('The parent collection name', 'string', true),
    rootParentId: libs.make.outParam('The root parent UGC ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    rootParentCollection: libs.make.outParam('The root parent collection name', 'string', true),
    userId: libs.make.outParam('The user ID of the author', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    appId: libs.make.schemaRef('schemas', 'fieldAppId'),
    type: libs.make.outParam('The UGC type', 'string', true, { enum: ['comment', 'article'] }),
    data: libs.make.schemaObject({
      title: libs.make.outParam('The article title', 'string', true),
      content: libs.make.outParam('The article content', 'string', true),
      pictures: libs.make.schemaArray(
        libs.make.outParam('Picture Id', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        { description: 'An array of picture IDs', required: false },
      ),
      videos: libs.make.schemaArray(
        libs.make.outParam('Videos Id', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
        { description: 'An array of videos IDs', required: false },
      ),
    }, { description: 'The UGC content, can be a simple string for a comment, or this object for an article', required: true }),
    trashed: libs.make.outParam('Whether this UGC was trashed', 'boolean', false),
    createdAt: libs.make.outParam('The UGC creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
    modifiedAt: libs.make.outParam('The UGC modification date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
  });
};
