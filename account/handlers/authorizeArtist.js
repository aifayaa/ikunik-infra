import winston from 'winston';
import authorizeArtist from '../lib/authorizeArtist';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ authorizationToken, methodArn }, context, callback) => {
  console.log("====ARTIST AUHTORIZER====", authorizationToken);
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const userId = await authorizeArtist(hashedLoginToken);
    if (userId) {
      winston.info('allow', authorizationToken, userId);
      return callback(null, generatePolicy('allow', methodArn, userId));
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
