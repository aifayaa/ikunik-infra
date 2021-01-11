export default (libs, output) => {
  output.components.schemas.ugcReports = libs.make.schemaObject({
    _id: libs.make.outParam('The ID of this report', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    appId: libs.make.schemaRef('schemas', 'fieldAppId'),
    createdAt: libs.make.outParam('The creation date of this report', 'string', true, { example: '1970-12-31T23:59:59.000Z' }),
    details: libs.make.outParam('The report details', 'string', true),
    reason: libs.make.outParam('The report reason', 'string', true, { enum: ['inappropriate'] }),
    ugcId: libs.make.outParam('The reported UGC ID', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
    userId: libs.make.outParam('The user who reported this', 'string', true, { example: 'b5dcc350-1052-4349-a271-859e44e2f80c' }),
  });
};
