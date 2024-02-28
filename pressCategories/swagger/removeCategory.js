/* eslint-disable import/no-relative-packages */
export default (libs, output) => {
  const method = libs.make.method('Deletes a single category by ID', [
    { name: 'pressCategories' },
  ]);

  method.parameters = [
    libs.make.param(
      'id',
      'path',
      'string',
      true,
      'The article category ID to delete'
    ),
  ];
  // resultDelete, resultTrashed
  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject({
        resultDelete: libs.make.outParam(
          'The output of the delete operation',
          'object',
          true
        ),
        resultTrashed: libs.make.outParam(
          'The output of the trashing operation for all articles that were in this category',
          'object',
          true
        ),
      })
    ),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/press/categories/{id}';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].delete = method;
};
