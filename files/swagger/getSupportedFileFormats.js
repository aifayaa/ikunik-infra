/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Returns all supported file formats', [
    { name: 'files' },
  ]);

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject(
        {},
        {
          description:
            'An object where each key is a mime type, and all values are booleans, to indicate support',
          example: {
            'image/gif': true,
            'image/jpeg': true,
            'image/png': true,
            'video/avi': true,
            'video/mkv': true,
            'video/mp4': true,
            'video/quicktime': true,
            'video/webm': true,
          },
        }
      )
    ),
    500: libs.make.responseError(
      'May be a server or client input error, check error message'
    ),
  };

  const path = '/files/formats';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
