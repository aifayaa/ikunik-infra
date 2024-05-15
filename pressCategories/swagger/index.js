/* eslint-disable import/no-relative-packages */
import getCategories from './getCategories';
import getCategoriesAdmin from './getCategoriesAdmin';
import getCategory from './getCategory';
import postCategory from './postCategory';
import putCategory from './putCategory';
import removeCategory from './removeCategory';

import js from '../serverless';

export default (libs, output) => {
  getCategories(libs, output);
  getCategoriesAdmin(libs, output);
  getCategory(libs, output);
  postCategory(libs, output);
  putCategory(libs, output);
  removeCategory(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
