import getSupportedFileFormats from './getSupportedFileFormats';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getSupportedFileFormats(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
