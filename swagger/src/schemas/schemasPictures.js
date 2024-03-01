export default (libs, output) => {
  output.components.schemas.pictures = libs.make.schemaObject({
    _id: libs.make.outParam('The image ID', 'string', true, {
      example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
    }),
    createdAt: libs.make.outParam('The image creation date', 'string', true, {
      example: '1970-12-31T23:59:59.000Z',
    }),
    thumbFileObj_ID: libs.make.outParam(
      'The thumbnail ID, if any',
      'string',
      false
    ),
    profil_ID: libs.make.outParam('The profile ID, if any', 'string', false),
    appId: libs.make.schemaRef('schemas', 'fieldAppId'),
    description: libs.make.outParam(
      'The image description, if any',
      'string',
      true
    ),
    fromUserId: libs.make.outParam(
      'The ID of the user who uploaded it',
      'string',
      true,
      { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }
    ),
    isPublished: libs.make.outParam(
      'If the picture is published',
      'boolean',
      true
    ),
    largeFilename: libs.make.outParam(
      'The file name of the large version of this picture',
      'string',
      true,
      { example: 'example.jpeg' }
    ),
    largeHeight: libs.make.outParam(
      'The file height of the large version of this picture',
      'integer',
      true
    ),
    largeUrl: libs.make.outParam(
      'The file url of the large version of this picture',
      'string',
      true,
      { example: 'https://abcd.cloudfront.net/some-image-name.jpeg' }
    ),
    largeWidth: libs.make.outParam(
      'The file width of the large version of this picture',
      'integer',
      true
    ),
    likes: libs.make.outParam(
      'The number of likes for this picture',
      'integer',
      true
    ),
    mediumFilename: libs.make.outParam(
      'The file name of the medium version of this picture',
      'string',
      true,
      { example: 'example.jpeg' }
    ),
    mediumHeight: libs.make.outParam(
      'The file height of the medium version of this picture',
      'integer',
      true
    ),
    mediumUrl: libs.make.outParam(
      'The file url of the medium version of this picture',
      'string',
      true,
      { example: 'https://abcd.cloudfront.net/some-image-name.jpeg' }
    ),
    mediumWidth: libs.make.outParam(
      'The file width of the medium version of this picture',
      'integer',
      true
    ),
    pictureFilename: libs.make.outParam(
      'The file name of the normal version of this picture',
      'string',
      true,
      { example: 'example.jpeg' }
    ),
    pictureHeight: libs.make.outParam(
      'The file height of the normal version of this picture',
      'integer',
      true
    ),
    pictureUrl: libs.make.outParam(
      'The file url of the normal version of this picture',
      'string',
      true,
      { example: 'https://abcd.cloudfront.net/some-image-name.jpeg' }
    ),
    pictureWidth: libs.make.outParam(
      'The file width of the normal version of this picture',
      'integer',
      true
    ),
    status: libs.make.outParam(
      'The status of this picture, using flags',
      'integer',
      false
    ),
    thumbFilename: libs.make.outParam(
      'The file name of the small version of this picture',
      'string',
      true,
      { example: 'example.jpeg' }
    ),
    thumbHeight: libs.make.outParam(
      'The file height of the small version of this picture',
      'integer',
      true
    ),
    thumbUrl: libs.make.outParam(
      'The file url of the small version of this picture',
      'string',
      true,
      { example: 'https://abcd.cloudfront.net/some-image-name.jpeg' }
    ),
    thumbWidth: libs.make.outParam(
      'The file width of the small version of this picture',
      'integer',
      true
    ),
    title: libs.make.outParam('The image title, if any', 'string', false),
  });
};
