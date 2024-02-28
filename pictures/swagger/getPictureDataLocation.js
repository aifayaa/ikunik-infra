/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method(
    'Redirects to the location of a picture (if the picture and specified quality exists)',
    [{ name: 'pictures' }]
  );

  method.parameters = [
    libs.make.param('id', 'url', 'string', true, 'The picture ID to fetch'),
    libs.make.param(
      'appId',
      'query',
      'string',
      false,
      'App ID (will use the default one if not provided'
    ),
    libs.make.param(
      'isPublished',
      'query',
      'boolean',
      false,
      'Whether we should only fetch published picture'
    ),
    libs.make.param(
      'quality',
      'query',
      'string',
      false,
      'A comma separated list of qualities to fetch, in the specified order',
      {
        example: 'thumb,medium,large',
        default: 'large,medium,thumb',
      }
    ),
  ];

  method.responses = {
    302: libs.make.response(
      'Success',
      libs.make.outParam('Nothing', 'string', false),
      {
        ...libs.defaultRespHeaders(),
        Location: {
          description: 'The picture data URL location',
          type: 'string',
          example: 'https://picture.url/...',
        },
      }
    ),
    404: libs.make.responseError('Picture not found'),
    500: libs.make.responseError('Server error'),
  };

  const path = '/pictures/{id}/datalocation';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
