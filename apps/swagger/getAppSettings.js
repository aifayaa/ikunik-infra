export default (libs, output) => {
  const method = libs.make.method('Get our current app settings', [
    { name: 'apps' },
  ]);

  method.responses = {
    200: libs.make.response(
      'Success',
      libs.make.schemaObject({
        public: libs.make.schemaObject({
          loginFacebook: libs.make.outParam(
            'True to accept Facebook logins',
            'boolean',
            true
          ),
          loginInstagram: libs.make.outParam(
            'True to accept Instagram logins',
            'boolean',
            true
          ),
          loginTwitter: libs.make.outParam(
            'True to accept Twitter logins',
            'boolean',
            true
          ),
        }),
      })
    ),
    404: libs.make.responseError('No app found'),
    500: libs.make.responseError('Server error, not handled'),
  };

  const path = '/apps/settings';
  if (!output.paths[path]) {
    output.paths[path] = {};
  }
  output.paths[path].get = method;
};
