/* eslint-disable import/no-relative-packages */
import getVideoThumbLocation from './getVideoThumbLocation';

import js from '../serverless';

export default (libs, output) => {
  getVideoThumbLocation(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
