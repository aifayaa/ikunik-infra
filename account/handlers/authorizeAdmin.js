/* eslint-disable import/no-relative-packages */
import authorizeAdmin from '../lib/authorizeAdmin';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';

// To avoid getting a warning with lint
const jsConsole = console;

export default async ({ headers, methodArn }) => {
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    jsConsole.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeAdmin(hashedLoginToken);
    if (user) {
      jsConsole.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, {
        userId: user._id,
        superAdmin: user.superAdmin,
        loginToken,
      });
    }
    jsConsole.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
