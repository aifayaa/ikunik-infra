import winston from 'winston';
import get from 'lodash/get';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';
import authorizeUser from '../lib/authorizeUser';
import getAppFromKey from '../lib/getAppFromKey';

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
    const user = await authorizeUser(hashedLoginToken);
    if (user) {
      winston.info('allow', authorizationToken, user._id);
      return callback(null, generatePolicy('allow', methodArn, { userId: user._id, appId: app._id }));
    }
    winston.info('deny', authorizationToken);
    return callback(null, generatePolicy('deny', methodArn, { appId: app._id }));
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    return callback(null, response);
  }
};
