/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import authorizeArtist from '../lib/authorizeArtist';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import getProfile from '../lib/getProfile';
import hashLoginToken from '../lib/hashLoginToken';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    jsConsole.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const app = await getAppFromKey(apiKey);
    const userId = await authorizeArtist(hashedLoginToken, app._id);
    const profileId = userId && (await getProfile(userId, app._id));
    if (userId && profileId) {
      jsConsole.info('allow', authorizationToken, userId);
      return generatePolicy('allow', methodArn, {
        userId,
        appId: app._id,
        profileId,
      });
    }
    jsConsole.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
