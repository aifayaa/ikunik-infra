/* eslint-disable import/no-relative-packages */
import get from 'lodash/get';
import authorizeWithPerms from '../lib/authorizeWithPerms';
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
    const app = apiKey ? await getAppFromKey(apiKey) : null;
    const opts = {};
    if (app) {
      opts.appId = app._id;
    }

    if (!authorizationToken) {
      jsConsole.info('allow public');
      return generatePolicy('allow', methodArn, opts);
    }
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeWithPerms(
      hashedLoginToken,
      (app && app._id) || null
    );
    if (user) {
      opts.userId = user.id;
      opts.perms = user.perms;
      opts.loginToken = user.loginToken;
      opts.superAdmin = user.superAdmin;
      jsConsole.info('allow', authorizationToken, user.id);
      return generatePolicy('allow', methodArn, opts);
    }
    jsConsole.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
