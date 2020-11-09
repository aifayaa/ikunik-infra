import getArticles from './getArticles';
import getAllArticles from './getAllArticles';
import getArticle from './getArticle';
import getArticleDraft from './getArticleDraft';
import postArticle from './postArticle';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getArticles(libs, output);
  getAllArticles(libs, output);
  getArticle(libs, output);
  getArticleDraft(libs, output);
  postArticle(libs, output);

  // Missing : press/articles (post)
  // Missing : press/articles (put)
  // Missing : press/articles/{id}
  // Missing : press/articles/{id}/publish
  // Missing : press/articles/{id}/unpublish

  // Missing : press/articles/{id}/purchase
  // Missing : press/purchasedArticles/

  libs.checks.forMissingAPIs(yaml, output);
};
