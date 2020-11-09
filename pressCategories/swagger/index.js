import getCategories from './getCategories';
import getCategoriesAdmin from './getCategoriesAdmin';
import getCategory from './getCategory';
import postCategory from './postCategory';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getCategories(libs, output);
  getCategoriesAdmin(libs, output);
  getCategory(libs, output);
  postCategory(libs, output);

  /**
   * Missing : /press/categories (Method post)
   * Missing : /press/categories/{id} (Method put)
   * Missing : /press/categories/{id} (Method delete)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
