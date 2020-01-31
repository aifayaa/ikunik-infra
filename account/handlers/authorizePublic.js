import winston from 'winston';
import get from 'lodash/get';

import authorizeUser from '../lib/authorizeUser';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';
import getAppFromKey from '../lib/getAppFromKey';

export default async (
  { headers, methodArn, requestContext },
) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization;

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
    const user = await authorizeUser(hashedLoginToken);

    if (user) {
      opts.userId = user._id;
      winston.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, opts);
    }
    winston.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    winston.info('forbidden', e);
    const response = {
      statusCode: 401,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    return response;
  }
};
