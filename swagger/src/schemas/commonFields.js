export default (libs, output) => {
  output.definitions.fieldAppIds = libs.make.schemaArray(
    libs.make.outParam('App IDs', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    { description: 'An array of app IDs' },
  );
};
