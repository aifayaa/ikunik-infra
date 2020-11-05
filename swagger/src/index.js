import SwaggerUI from 'swagger-ui';
import 'swagger-ui/dist/swagger-ui.css';
import libs from './libs';

import auth from '../../auth/swagger';

const spec = require('./swagger-config.yaml');

auth(libs, spec);

SwaggerUI({
  spec,
  dom_id: '#swagger',
});

// ui.initOAuth({
//   appName: "Swagger UI Webpack Demo",
//   // See https://demo.identityserver.io/ for configuration details.
//   clientId: 'implicit',
// });
