/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import authorizeUser from '../lib/authorizeUser';
import generatePolicy from '../lib/generatePolicy';
import getAppFromKey from '../lib/getAppFromKey';
import hashLoginToken from '../lib/hashLoginToken';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ headers, methodArn, requestContext }) => {
  const apiKey = get(requestContext, 'identity.apiKey');
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    jsConsole.info(authorizationToken, methodArn);
    const app = await getAppFromKey(apiKey);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeUser(hashedLoginToken, app._id);
    if (user) {
      jsConsole.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, {
        userId: user._id,
        appId: app._id,
        loginToken,
      });
    }
    jsConsole.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn, { appId: app._id });
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
