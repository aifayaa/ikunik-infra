import winston from 'winston';
import get from 'lodash/get';
import authorizeWithPerms from '../lib/authorizeWithPerms';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import getProfile from '../lib/getProfile';
import hashLoginToken from '../lib/hashLoginToken';

export default async (
  { headers, methodArn, requestContext },
  context,
  callback,
) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization;
  try {
    winston.info(authorizationToken, methodArn);
    const app = await getAppFromKey(apiKey);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeWithPerms(hashedLoginToken, app._id);
    const profileId = user.id && await getProfile(user.id, app._id);
    if (user.id) {
      winston.info('allow', authorizationToken, user.id, user.perms);
      return callback(null, generatePolicy('allow', methodArn, { profileId, userId: user.id, perms: user.perms, appId: app._id }));
    }
    winston.info('deny', authorizationToken);
    return callback(null, generatePolicy('deny', methodArn, { appId: app._id }));
  } catch (e) {
    const response = {
      statusCode: 401,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    return callback(null, response);
  }
};
