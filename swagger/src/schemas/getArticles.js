export default (libs, output) => {
  if (!output.definitions.customs.pressArticles) {
    output.definitions.customs.pressArticles = {};
  }

  output.definitions.customs.pressArticles.getArticles = libs.make.schemaObject({
    total: libs.make.outParam('The number of returned articles', 'integer', true, { example: 1 }),
    articles: libs.make.schemaArray(libs.make.schemaRef('customs', 'pressArticles', 'getArticle')),
  });
};
