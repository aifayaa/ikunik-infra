import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';
import schemas from './schemas';
import libs from './libs';

import apps from '../../apps/swagger';
import auth from '../../auth/swagger';
import files from '../../files/swagger';
import pressArticles from '../../pressArticles/swagger';
import pressCategories from '../../pressCategories/swagger';
import userGeneratedContents from '../../userGeneratedContents/swagger';
import users from '../../users/swagger';

const spec = require('./swagger-config.yaml');

schemas(libs, spec);
apps(libs, spec);
auth(libs, spec);
files(libs, spec);
pressArticles(libs, spec);
pressCategories(libs, spec);
userGeneratedContents(libs, spec);
users(libs, spec);

SwaggerUI({
  spec,
  dom_id: '#swagger',
});
