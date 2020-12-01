import search from './search';

import yaml from '../serverless.yml';

export default (libs, output) => {
  search(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
