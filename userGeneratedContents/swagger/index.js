import postUserGeneratedContents from './postUserGeneratedContents';
import getAllUserGeneratedContents from './getAllUserGeneratedContents';

import yaml from '../serverless.yml';

export default (libs, output) => {
  postUserGeneratedContents(libs, output);
  getAllUserGeneratedContents(libs, output);

  /**
   * Missing : /userGeneratedContents/{id} (Method get)
   * Missing : /userGeneratedContents/{id}/children (Method get)
   * Missing : /press/articles/{id}/userGeneratedContents (Method get)
   * Missing : /userGeneratedContents/{id} (Method patch)
   * Missing : /userGeneratedContents/{id} (Method delete)
   * Missing : /userGeneratedContents/{id}/report (Method post)
   * Missing : /userGeneratedContents/{id}/reports (Method get)
   * Missing : /userGeneratedContents/{id}/review (Method patch)
   */

  libs.checks.forMissingAPIs(yaml, output);
};
