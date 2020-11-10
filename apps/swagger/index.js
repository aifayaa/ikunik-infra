import getAppSettings from './getAppSettings';
import getAppInfos from './getAppInfos';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getAppSettings(libs, output);
  getAppInfos(libs, output);

  /*
   * Missing : /apps/{id}/builds (Method get)
   * Missing : /apps/{id}/tos (Method get)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
