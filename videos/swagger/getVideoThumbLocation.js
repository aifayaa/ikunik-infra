/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method(
    'Redirects to the location of a video thumbnail URL (if the video and thumbnail exists)',
    [{ name: 'videos' }]
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
  ];

  method.responses = {
    302: libs.make.response(
      'Success',
      libs.make.outParam('Nothing', 'string', false),
      {
        ...libs.defaultRespHeaders(),
        Location: {
          description: 'The thumbnail location',
          type: 'string',
          example: 'https://video.thumbnail.url/...',
        },
      }
    ),
    404: libs.make.responseError('Video not found'),
    500: libs.make.responseError('Server error'),
  };

  const path = '/videos/{id}/thumblocation';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
