import schemasApps from './schemasApps';
import schemasCommonFields from './commonFields';
import schemasPictures from './schemasPictures';
import schemasPressArticles from './schemasPressArticles';
import schemasPressCategories from './schemasPressCategories';
import schemasPressDrafts from './schemasPressDrafts';
import schemasUGC from './schemasUGC';
import schemasUGCReports from './schemasUGCReports';
import schemasUsers from './schemasUsers';
import getArticles from './getArticles';
import getAllArticles from './getAllArticles';
import getArticle from './getArticle';
import getArticleDraft from './getArticleDraft';
import getCategories from './getCategories';

export default (libs, spec) => {
  schemasCommonFields(libs, spec);

  schemasApps(libs, spec);
  schemasPictures(libs, spec);
  schemasPressArticles(libs, spec);
  schemasPressCategories(libs, spec);
  schemasPressDrafts(libs, spec);
  schemasUGC(libs, spec);
  schemasUGCReports(libs, spec);
  schemasUsers(libs, spec);

  getArticles(libs, spec);
  getAllArticles(libs, spec);
  getArticle(libs, spec);
  getArticleDraft(libs, spec);
  getCategories(libs, spec);
};
