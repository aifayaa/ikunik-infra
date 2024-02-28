/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const handler = {
    get: libs.make.method('Get the last draft for the given article ID', [
      { name: 'pressArticles' },
    ]),
  };

  handler.get.parameters = [
    libs.make.param(
      'id',
      'path',
      'string',
      true,
      'The article draft ID to return'
    ),
  ];

  handler.get.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaRef('responses', 'pressArticles', 'getArticleDraft')
    ),
    404: libs.make.responseError('No article found at this ID'),
    500: libs.make.responseError('Server error, not handled'),
  };

  output.paths['/press/articles/{id}/draft'] = handler;
};
