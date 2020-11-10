import getUserPublic from './getUserPublic';


import yaml from '../serverless.yml';

export default (libs, output) => {
  getUserPublic(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
