import get from 'lodash/get';
import winston from 'winston';
import authorizeUser from '../lib/authorizeUser';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    winston.info(authorizationToken, methodArn);
    const app = await getAppFromKey(apiKey);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeUser(hashedLoginToken);
    if (user) {
      winston.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, { userId: user._id, appId: app._id });
    }
    winston.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn, { appId: app._id });
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
