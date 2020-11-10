import getUserPublic from './getUserPublic';
import getProfile from './getProfile';


import yaml from '../serverless.yml';

export default (libs, output) => {
  getUserPublic(libs, output);
  getProfile(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
