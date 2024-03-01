/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method("Returns a list of a user's apps", [
    { name: 'users' },
  ]);

  method.parameters = [
    libs.make.param(
      'id',
      'path',
      'string',
      true,
      'The user ID. Must be your own user ID.'
    ),
  ];

  const websites = libs.make.schemaArray(
    libs.make.schemaObject({
      _id: libs.make.outParam('The website internal id', 'string', true),
      type: libs.make.outParam('Type of website', 'string', true),
      dns: libs.make.schemaObject({
        internal: libs.make.schemaObject({
          name: libs.make.outParam('Name', 'string', true, {
            example: 'preview-egm-om.sites.crowdaa.com',
          }),
        }),
      }),
      ssl: libs.make.schemaObject({
        domains: libs.make.schemaArray(
          libs.make.outParam('Domain', 'string', true, {
            example: 'example.com',
          })
        ),
      }),
    })
  );

  const items = libs.make.schemaArray(
    libs.make.schemaObject({
      _id: libs.make.outParam('The app internal id', 'string', true),
      name: libs.make.outParam('The app name', 'string', true),
      websites,
    }),
    { description: 'An array of apps' }
  );

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject({
        items,
        totalCount: libs.make.outParam('The number of items', 'number', true),
      })
    ),
    403: libs.make.responseError('Forbidden'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/users/{id}/apps';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
