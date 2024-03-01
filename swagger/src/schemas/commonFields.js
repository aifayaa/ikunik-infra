export default (libs, output) => {
  output.components.schemas.fieldAppId = libs.make.outParam(
    'App ID',
    'string',
    true,
    {
      example: 'b5dcc350-1052-4349-a271-859e44e2f80c',
      description: 'An app ID',
    }
  );
};
