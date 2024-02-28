/* eslint-disable import/no-relative-packages */
import getUploadUrl from './getUploadUrl';
import getSupportedFileFormats from './getSupportedFileFormats';

import yaml from '../serverless.yml';

export default (libs, output) => {
  getUploadUrl(libs, output);
  getSupportedFileFormats(libs, output);

  libs.checks.forMissingAPIs(yaml, output);
};
