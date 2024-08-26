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
    const user = await authorizeArtist(hashedLoginToken, app._id);
    const profileId = user && (await getProfile(user._id, app._id));
    if (user && profileId) {
      jsConsole.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, {
        userId: user._id,
        superAdmin: user.superAdmin,
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
