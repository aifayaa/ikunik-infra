import winston from 'winston';
import authorizeRole from '../lib/authorizeRole';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ authorizationToken, methodArn }, context, callback) => {
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeRole(hashedLoginToken);
    if (user.id) {
      winston.info('allow', authorizationToken, user.id, user.roles);
      return callback(null, generatePolicy('allow', methodArn, user.id, user.roles));
    }
    winston.info('deny', authorizationToken);
    return callback(null, generatePolicy('deny', methodArn, null, null));
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
