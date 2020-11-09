export default (libs, output) => {
  output.components.schemas.collPressCategories = libs.make.schemaObject({
    _id: libs.make.outParam('The category ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    name: libs.make.outParam('The category name', 'string', true),
    pathName: libs.make.outParam('The category name that will be visible in the URL', 'string', true),
    color: libs.make.outParam('The category color, if any will be visible in the URL', 'string', false, { example: '#c0ffee' }),
    appIds: libs.make.schemaRef('schemas', 'fieldAppIds'),
    createdAt: libs.make.outParam('The category creation date', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
    order: libs.make.outParam('An ordering number, to sort categories', 'integer', true, { example: 999 }),
    hidden: libs.make.outParam('Indicates if this category is hidden', 'boolean', false),
    picture: libs.make.outParam('An array of pictures IDs', 'array', false, { example: [] }),
  });
};
