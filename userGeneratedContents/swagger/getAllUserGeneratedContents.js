export default (libs, output) => {
  const method = libs.make.method('Returns all UGC according to input filters', [{ name: 'User Generated Contents' }]);

  method.parameters = [
    libs.make.param('start', 'query', 'integer', true, 'Offset of the search results'),
    libs.make.param('limit', 'query', 'integer', true, 'Maximum number of results to return'),
    libs.make.param('countOnly', 'query', 'boolean', false, 'Returns only the number of elements. Incompatible with "raw".'),
    libs.make.param('moderated', 'query', 'boolean', false, 'To fetch only the moderated (or not) UGC. Only for moderators'), // @TODO Check this description
    libs.make.param('moderator', 'query', 'boolean', false, 'To fetch UGCs that need a review. Only for moderators'), // @TODO Check this description
    libs.make.param('parentId', 'query', 'string', false, 'Filter by root parent ID'),
    libs.make.param('raw', 'query', 'boolean', false, 'Indicates whether we want the raw output directly'),
    libs.make.param('reported', 'query', 'boolean', false, 'Returns only reported UGCs'),
    libs.make.param('reportsCount', 'query', 'string', false, 'Also returns the number of reported UGCs'),
    libs.make.param('reviewed', 'query', 'boolean', false, 'Checks whether the UGC was reviewed by a moderator. Only for moderators'), // @TODO Check this description
    libs.make.param('sortBy', 'query', 'string', false, 'Select the sorting field of the output'),
    libs.make.param('sortOrder', 'query', 'string', false, 'Select the sorting order of the output', { enum: ['desc', 'asc'] }),
    libs.make.param('trashed', 'query', 'boolean', false, 'Filter by trashed UGCs'),
    libs.make.param('type', 'query', 'string', false, 'Filter by UGC type', { enum: ['comment', 'article'] }),
    libs.make.param('userId', 'query', 'string', false, 'Filter by user IDs'),
  ];

  method.responses = {
    200: libs.make.response('Success', { oneOf: [
      libs.make.schemaRef('schemas', 'collUGC'),
      libs.make.schemaObject({
        totalCount: libs.make.outParam('The number of returned items', 'integer', true),
        items: libs.make.schemaRef('schemas', 'collUGC'),
      }),
    ] }),
    401: libs.make.responseError('Not enough permissions'),
    500: libs.make.responseError('May be a server or client input error, check error message'),
  };

  const path = '/userGeneratedContents';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
