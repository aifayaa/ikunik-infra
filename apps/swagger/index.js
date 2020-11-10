import getAppSettings from './getAppSettings';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getAppSettings(libs, output);

  /*
   * Missing : /apps/{id}/infos (Method get)
   * Missing : /apps/{id}/builds (Method get)
   * Missing : /apps/{id}/tos (Method get)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
