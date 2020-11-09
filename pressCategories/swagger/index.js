import getCategories from './getCategories';
import getCategoriesAdmin from './getCategoriesAdmin';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getCategories(libs, output);
  getCategoriesAdmin(libs, output);

  /**
   * Missing : /admin/press/categories (Method get)
   * Missing : /press/categories/{id} (Method get)
   * Missing : /press/categories (Method post)
   * Missing : /press/categories/{id} (Method put)
   * Missing : /press/categories/{id} (Method delete)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
