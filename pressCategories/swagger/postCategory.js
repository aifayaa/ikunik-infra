export default (libs, output) => {
  const method = libs.make.method('Creates a press category', [
    { name: 'pressCategories' },
  ]);

  method.requestBody = libs.make.requestBody(
    'This is the whole request body',
    true,
    libs.make.schemaObject({
      name: libs.make.outParam('The category name', 'string', true),
      pathName: libs.make.outParam(
        'The category name that will be visible in the URL',
        'string',
        true,
      ),
      color: libs.make.outParam(
        'The category color, if any will be visible in the URL',
        'string',
        false,
        { example: '#c0ffee' },
      ),
      order: libs.make.outParam(
        'An ordering number, to sort categories',
        'integer',
        true,
        { example: 999 },
      ),
      hidden: libs.make.outParam(
        'Indicates if this category is hidden',
        'boolean',
        false,
      ),
      picture: libs.make.outParam('An array of pictures IDs', 'array', false, {
        example: [],
      }),
      action: libs.make.outParam(
        'URL to another external website or to an article from the app  or phone number',
        'string',
        false,
        {
          enum: ['tel:', 'https://<url>', 'http://<url>', '/articles/<id>'],
          example: 'http://google.com',
        },
      ),
    }),
  );

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaRef('schemas', 'pressCategories'),
    ),
    400: libs.make.responseError('Invalid or missing inputs'),
    403: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/categories';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
