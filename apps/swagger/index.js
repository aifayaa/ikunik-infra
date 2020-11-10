import getAppSettings from './getAppSettings';
import getAppInfos from './getAppInfos';
import getAppBuilds from './getAppBuilds';
import getAppTos from './getAppTos';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getAppSettings(libs, output);
  getAppInfos(libs, output);
  getAppBuilds(libs, output);
  getAppTos(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
