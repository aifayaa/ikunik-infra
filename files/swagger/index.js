/* eslint-disable import/no-relative-packages */
import getUploadUrl from './getUploadUrl';
import getSupportedFileFormats from './getSupportedFileFormats';

import js from '../serverless';

export default (libs, output) => {
  getUploadUrl(libs, output);
  getSupportedFileFormats(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
