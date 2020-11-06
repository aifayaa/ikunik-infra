import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';
import schemas from './schemas';
import libs from './libs';

import auth from '../../auth/swagger';
import pressArticles from '../../pressArticles/swagger';

const spec = require('./swagger-config.yaml');

schemas(libs, spec);
auth(libs, spec);
pressArticles(libs, spec);

SwaggerUI({
  spec,
  dom_id: '#swagger',
});

// ui.initOAuth({
//   appName: "Swagger UI Webpack Demo",
//   // See https://demo.identityserver.io/ for configuration details.
//   clientId: 'implicit',
// });
