/* eslint-disable import/no-relative-packages */
import search from './search';

import js from '../serverless';

export default (libs, output) => {
  search(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
