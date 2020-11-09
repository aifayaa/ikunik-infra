import postUserGeneratedContents from './postUserGeneratedContents';

import yaml from '../serverless.yml';

export default (libs, output) => {
  postUserGeneratedContents(libs, output);

  /**
   * Missing : /userGeneratedContents (Method post)
   * Missing : /press/articles/userGeneratedContents (Method post)
   * Missing : /userGeneratedContents (Method get)
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
