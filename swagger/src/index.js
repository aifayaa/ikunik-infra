import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';
import schemas from './schemas';
import libs from './libs';

import auth from '../../auth/swagger';
import pressArticles from '../../pressArticles/swagger';
import pressCategories from '../../pressCategories/swagger';
import userGeneratedContents from '../../userGeneratedContents/swagger';

const spec = require('./swagger-config.yaml');

schemas(libs, spec);
auth(libs, spec);
pressArticles(libs, spec);
pressCategories(libs, spec);
userGeneratedContents(libs, spec);

SwaggerUI({
  spec,
  dom_id: '#swagger',
});
