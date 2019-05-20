import get from 'lodash/get';
import winston from 'winston';
import authorizeArtist from '../lib/authorizeArtist';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';
import getAppFromKey from '../lib/getAppFromKey';
import getProfile from '../lib/getProfile';

export default async (
  { headers, methodArn, requestContext },
  context,
  callback,
) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.Authorization;
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const [userId, app] = await Promise.all([
      authorizeArtist(hashedLoginToken),
      getAppFromKey(apiKey),
    ]);
    const profileId = userId && await getProfile(userId, app._id);
    if (userId && profileId) {
      winston.info('allow', authorizationToken, userId);
      return callback(null, generatePolicy('allow', methodArn, { userId, appId: app._id, profileId }));
    }
    winston.info('deny', authorizationToken);
    return callback(null, generatePolicy('deny', methodArn));
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
