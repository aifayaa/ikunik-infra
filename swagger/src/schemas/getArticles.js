export default (libs, output) => {
  if (!output.components.responses.pressArticles) {
    output.components.responses.pressArticles = {};
  }

  output.components.responses.pressArticles.getArticles = libs.make.schemaObject({
    total: libs.make.outParam('The number of returned articles', 'integer', true, { example: 1 }),
    articles: libs.make.schemaArray(libs.make.schemaRef('responses', 'pressArticles', 'getArticle')),
  });
};
