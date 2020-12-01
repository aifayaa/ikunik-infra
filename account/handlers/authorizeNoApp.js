import authorizeUser from '../lib/authorizeUser';
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
    const user = await authorizeUser(hashedLoginToken);
    if (user) {
      jsConsole.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, { userId: user._id });
    }
    jsConsole.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
