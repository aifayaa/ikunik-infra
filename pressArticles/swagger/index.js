import getArticles from './getArticles';
import getAllArticles from './getAllArticles';
import getArticle from './getArticle';
import getArticleDraft from './getArticleDraft';
import postArticle from './postArticle';
import putArticle from './putArticle';
import publishArticle from './publishArticle';
import unpublishArticle from './unpublishArticle';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getArticles(libs, output);
  getAllArticles(libs, output);
  getArticle(libs, output);
  getArticleDraft(libs, output);
  postArticle(libs, output);
  putArticle(libs, output);
  publishArticle(libs, output);
  unpublishArticle(libs, output);

  // /press/articles/{id}/publish (Method put)
  // /press/articles/{id}/unpublish (Method put)
  // /press/articles/{id} (Method delete)

  libs.checks.forMissingAPIs(yaml, output);
};
