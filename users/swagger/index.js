/* eslint-disable import/no-relative-packages */
import getUserPublic from './getUserPublic';
import getProfile from './getProfile';
import generateApiToken from './generateApiToken';
import getApps from './getApps';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getUserPublic(libs, output);
  getApps(libs, output);
  getProfile(libs, output);
  generateApiToken(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
