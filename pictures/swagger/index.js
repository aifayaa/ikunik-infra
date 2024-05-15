/* eslint-disable import/no-relative-packages */
import getPicture from './getPicture';
import getPictureDataLocation from './getPictureDataLocation';

import js from '../serverless';

export default (libs, output) => {
  getPicture(libs, output);
  getPictureDataLocation(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
