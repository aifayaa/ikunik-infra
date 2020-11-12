import getPicture from './getPicture';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getPicture(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
