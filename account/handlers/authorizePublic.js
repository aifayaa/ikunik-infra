import winston from 'winston';

import authorizeUser from '../lib/authorizeUser';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ headers, methodArn }, context, callback) => {
  const authorizationToken = headers.Authorization;
  try {
    winston.info(authorizationToken, methodArn);
    if (!authorizationToken) {
      winston.info('deny', authorizationToken);
      return callback(null, generatePolicy('allow', methodArn, null));
    }
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeUser(hashedLoginToken);

    if (user) {
      winston.info('allow', authorizationToken, user._id);
      return callback(null, generatePolicy('allow', methodArn, user._id));
    }
    winston.info('deny', authorizationToken);
    return callback(null, generatePolicy('deny', methodArn, null));
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
