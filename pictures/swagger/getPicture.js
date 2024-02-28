/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Returns a picture informations & URLs', [
    { name: 'pictures' },
  ]);

  method.parameters = [
    libs.make.param('id', 'url', 'string', true, 'The picture ID to fetch'),
    libs.make.param(
      'isPublished',
      'query',
      'boolean',
      false,
      'Whether we should only fetch published picture'
    ),
  ];

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaRef('schemas', 'pictures')
    ),
    500: libs.make.responseError('Server error'),
  };

  const path = '/pictures/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
