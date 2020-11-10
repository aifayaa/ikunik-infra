import getAppSettings from './getAppSettings';
import getAppInfos from './getAppInfos';
import getAppBuilds from './getAppBuilds';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getAppSettings(libs, output);
  getAppInfos(libs, output);
  getAppBuilds(libs, output);

  /*
   * Missing : /apps/{id}/tos (Method get)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
