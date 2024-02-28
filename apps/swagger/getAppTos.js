/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Get an app Terms Of Services', [
    { name: 'apps' },
  ]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The app ID'),
    libs.make.param('Accept', 'header', 'string', false, 'The output format', {
      schema: { enum: ['application/json', 'text/html'] },
      example: 'application/json',
    }),
  ];

  method.responses = {
    200: libs.make.responseMulti(
      'The response may either be an HTML output if the request headers allows it, or a JSON output containing these fields : _id, title, html, link, outdated',
      {
        'text/html': {
          schema: {
            type: 'string',
          },
          example: '<html>Some TOS document...</html>',
        },
        'application/json': {
          schema: libs.make.schemaObject({
            _id: libs.make.outParam('The TOS id', 'string', true, {
              example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
            }),
            title: libs.make.outParam('The TOS title', 'string', true),
            html: libs.make.outParam(
              'The TOS content, as HTML',
              'string',
              true
            ),
            link: libs.make.outParam('The TOS public link', 'string', true),
            outdated: libs.make.outParam(
              'Whether these TOS are outdated',
              'boolean',
              true
            ),
          }),
        },
      }
    ),
    404: libs.make.responseError('No app found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/apps/{id}/tos';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
