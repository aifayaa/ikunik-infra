export default (libs, output) => {
  const method = libs.make.method('Returns all visible child UGC from a given root UGC', [{ name: 'userGeneratedContents' }]);

  method.parameters = [
    libs.make.param('id', 'path', 'string', true, 'The UGC ID'),
    libs.make.param('start', 'query', 'integer', true, 'Offset of the search results'),
    libs.make.param('limit', 'query', 'integer', true, 'Maximum number of results to return'),
  ];

  method.responses = {
    200: libs.make.response('Success', libs.make.schemaRef('schemas', 'userGeneratedContents')), // @TODO Not the exact output, some parameters are filters, others are filled from other databases, like user. Fix me.
    500: libs.make.responseError('May be a server or client input error, check error message'),
  };

  let path = '/userGeneratedContents/{id}/children';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;

  path = '/press/articles/{id}/userGeneratedContents';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
