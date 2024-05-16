/* eslint-disable import/no-relative-packages */
import postUserGeneratedContents from './postUserGeneratedContents';
import getAllUserGeneratedContents from './getAllUserGeneratedContents';
import getUserGeneratedContents from './getUserGeneratedContents';
import getChildrenUserGeneratedContents from './getChildrenUserGeneratedContents';
import patchUserGeneratedContents from './patchUserGeneratedContents';
import removeUserGeneratedContents from './removeUserGeneratedContents';
import reportUserGeneratedContents from './reportUserGeneratedContents';
import getUserGeneratedContentReports from './getUserGeneratedContentReports';
import reviewUserGeneratedContents from './reviewUserGeneratedContents';

import js from '../serverless';

export default (libs, output) => {
  postUserGeneratedContents(libs, output);
  getAllUserGeneratedContents(libs, output);
  getUserGeneratedContents(libs, output);
  getChildrenUserGeneratedContents(libs, output);
  patchUserGeneratedContents(libs, output);
  removeUserGeneratedContents(libs, output);
  reportUserGeneratedContents(libs, output);
  getUserGeneratedContentReports(libs, output);
  reviewUserGeneratedContents(libs, output);

  libs.checks.forMissingAPIs(js, output);
};
