export default (libs, output) => {
  const method = libs.make.method('Creates a new UGC (User Generated Content)', [{ name: 'userGeneratedContents' }]);

  method.requestBody = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    parentId: libs.make.outParam('The previous UGC ID (for a reply)', 'string', true),
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
    rootParentId: libs.make.outParam('The root parent ID (article or UGC)', 'string', false),
    rootParentCollection: libs.make.outParam('The root parent collection on which the UGC was made', 'string', false),
  }));

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('schemas', 'collUGC')),
    500: libs.make.responseError('Server error, not handled'),
  };

  let path = '/userGeneratedContents';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;

  path = '/press/articles/userGeneratedContents';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
