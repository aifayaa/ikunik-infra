import postUserGeneratedContents from './postUserGeneratedContents';
import getAllUserGeneratedContents from './getAllUserGeneratedContents';
import getUserGeneratedContents from './getUserGeneratedContents';
import getChildrenUserGeneratedContents from './getChildrenUserGeneratedContents';
import patchUserGeneratedContents from './patchUserGeneratedContents';

import yaml from '../serverless.yml';

export default (libs, output) => {
  postUserGeneratedContents(libs, output);
  getAllUserGeneratedContents(libs, output);
  getUserGeneratedContents(libs, output);
  getChildrenUserGeneratedContents(libs, output);
  patchUserGeneratedContents(libs, output);

  /**
   * Missing : /userGeneratedContents/{id} (Method patch)
   * Missing : /userGeneratedContents/{id} (Method delete)
   * Missing : /userGeneratedContents/{id}/report (Method post)
   * Missing : /userGeneratedContents/{id}/reports (Method get)
   * Missing : /userGeneratedContents/{id}/review (Method patch)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
