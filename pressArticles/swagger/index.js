import getArticles from './getArticles';
import getAllArticles from './getAllArticles';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getArticles(libs, output);
  getAllArticles(libs, output);

  // Missing : press/articlesAll/
  // Missing : press/purchasedArticles/
  // Missing : press/articles/{id}
  // Missing : press/articles/{id}/draft
  // Missing : press/articles 2
  // Missing : press/articles/{id}/publish
  // Missing : press/articles/{id}/unpublish
  // Missing : press/articles/{id}/purchase
  // Missing : press/articles/{id}

  libs.checks.forMissingAPIs(yaml, output);
};
