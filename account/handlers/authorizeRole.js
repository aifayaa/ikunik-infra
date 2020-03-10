import get from 'lodash/get';
import winston from 'winston';
import authorizeRole from '../lib/authorizeRole';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import getProfile from '../lib/getProfile';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const [user, app] = await Promise.all([
      authorizeRole(hashedLoginToken),
      getAppFromKey(apiKey),
    ]);
    const profileId = user.id && await getProfile(user.id, app._id);
    if (user.id) {
      winston.info('allow', authorizationToken, user.id, user.roles, app._id);
      return generatePolicy('allow', methodArn, { userId: user.id, profileId, roles: user.roles, appId: app._id });
    }
    winston.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
