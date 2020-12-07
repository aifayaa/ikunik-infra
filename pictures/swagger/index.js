import getPicture from './getPicture';
import getPictureDataLocation from './getPictureDataLocation';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getPicture(libs, output);
  getPictureDataLocation(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
