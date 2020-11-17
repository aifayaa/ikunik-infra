export default (libs, output) => {
  const method = libs.make.method('Updates an UGC', [{ name: 'userGeneratedContents' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID to edit'),
  ];

  method.requestBody = libs.make.requestBody('This is the whole request body', true, {
    oneOf: [
      libs.make.schemaObject({
        data: libs.make.outParam('', 'string', true),
      }),
      libs.make.schemaObject({
        title: libs.make.outParam('The article title', 'string', true),
        content: libs.make.outParam('The article content', 'string', true),
        pictures: libs.make.schemaArray(
          libs.make.outParam('Picture Id', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
          { description: 'An array of picture IDs, required even if empty', required: true },
        ),
        videos: libs.make.schemaArray(
          libs.make.outParam('Videos Id', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
          { description: 'An array of videos IDs', required: false },
        ),
      }, { description: 'The UGC content, can be a simple string for a comment, or this object for an article', required: true }),
    ],
    example: {
      data: {
        title: 'title',
        content: 'content',
        pictures: ['b5dcc350-1052-4349-a271-859e44e2f80c'],
        videos: ['b5dcc350-1052-4349-a271-859e44e2f80c'],
      },
    },
  });

  method.responses = {
    200: libs.make.response('Success', libs.make.outParam('True for success', 'boolean', true)),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/userGeneratedContents/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].patch = method;
};
