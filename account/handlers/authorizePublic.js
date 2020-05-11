import winston from 'winston';
import get from 'lodash/get';

import authorizeWithPerms from '../lib/authorizeWithPerms';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';
import getAppFromKey from '../lib/getAppFromKey';

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;

  try {
    winston.info(authorizationToken, methodArn);
    const app = apiKey ? await getAppFromKey(apiKey) : null;
    const opts = {};
    if (app) { opts.appId = app._id; }

    if (!authorizationToken) {
      winston.info('allow public');
      return generatePolicy('allow', methodArn, opts);
    }
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeWithPerms(hashedLoginToken, (app && app._id) || null);
    if (user) {
      opts.userId = user.id;
      opts.perms = user.perms;
      winston.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, opts);
    }
    winston.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
