import getCategories from './getCategories';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getCategories(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
