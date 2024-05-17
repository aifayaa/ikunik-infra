/* eslint-disable import/no-relative-packages */
import getVideoThumbLocation from './getVideoThumbLocation';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getVideoThumbLocation(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
