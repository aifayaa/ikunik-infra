import get from 'lodash/get';
import authorizeRole from '../lib/authorizeRole';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import getProfile from '../lib/getProfile';
import hashLoginToken from '../lib/hashLoginToken';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    jsConsole.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const app = getAppFromKey(apiKey);
    const user = authorizeRole(hashedLoginToken, app._id);
    const profileId = user.id && await getProfile(user.id, app._id);
    if (user.id) {
      jsConsole.info('allow', authorizationToken, user.id, user.roles, app._id);
      return generatePolicy('allow', methodArn, { userId: user.id, profileId, roles: user.roles, appId: app._id });
    }
    jsConsole.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
