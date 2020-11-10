export default (libs, output) => {
  const method = libs.make.method('Prepares slots to be able to upload files, returns one upload URL for each file', [{ name: 'files' }]);

  method.requestBody = libs.make.requestBody('This is the whole request body', true, libs.make.schemaObject({
    files: libs.make.schemaArray(
      libs.make.schemaObject({
        name: libs.make.outParam('File name', 'string', true),
        type: libs.make.outParam('File type', 'string', true),
        size: libs.make.outParam('File size', 'integer', true),
      }),
      { description: 'An array of files to upload', required: true },
    ),
    metadata: libs.make.schemaObject({}, { description: 'Metadata that we should add for each files, for the Amazon S3 API' }),
  }));

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaArray(
      libs.make.schemaObject({
        id: libs.make.outParam('The created file ID for this file', 'string', true),
        name: libs.make.outParam('The name you gave this file', 'string', true),
        url: libs.make.outParam('The URL where to upload this file', 'string', true),
      }),
      { description: 'Each object is placed in the same place in the output array as in the request' },
    )),
    500: libs.make.responseError('Server error'),
  };

  const path = '/files';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].post = method;
};
