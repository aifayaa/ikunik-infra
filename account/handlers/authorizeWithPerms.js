import winston from 'winston';
import get from 'lodash/get';
import authorizeWithPerms from '../lib/authorizeWithPerms';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import getProfile from '../lib/getProfile';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    winston.info(authorizationToken, methodArn);
    const app = await getAppFromKey(apiKey);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeWithPerms(hashedLoginToken, app._id);
    const profileId = user.id && await getProfile(user.id, app._id);
    if (user.id) {
      winston.info('allow', authorizationToken, user.id, user.perms);
      return generatePolicy('allow', methodArn, { profileId, userId: user.id, perms: user.perms, appId: app._id });
    }
    winston.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn, { appId: app._id });
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
