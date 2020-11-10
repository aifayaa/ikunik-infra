import schemasCommonFields from './commonFields';
import schemasPictures from './collPictures';
import schemasPressCategories from './collPressCategories';
import schemasUGC from './collUGC';
import schemasUGCReports from './collUGCReports';
import getArticles from './getArticles';
import getAllArticles from './getAllArticles';
import getArticle from './getArticle';
import getArticleDraft from './getArticleDraft';
import getCategories from './getCategories';

export default (libs, spec) => {
  schemasCommonFields(libs, spec);

  schemasPictures(libs, spec);
  schemasPressCategories(libs, spec);
  schemasUGC(libs, spec);
  schemasUGCReports(libs, spec);

  getArticles(libs, spec);
  getAllArticles(libs, spec);
  getArticle(libs, spec);
  getArticleDraft(libs, spec);
  getCategories(libs, spec);
};
