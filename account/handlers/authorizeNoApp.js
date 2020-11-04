import winston from 'winston';
import authorizeUser from '../lib/authorizeUser';
import generatePolicy from '../lib/generatePolicy';
import hashLoginToken from '../lib/hashLoginToken';

export default async ({ headers, methodArn }) => {
  const authorizationToken = headers.authorization || headers.Authorization;
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await authorizeUser(hashedLoginToken);
    if (user) {
      winston.info('allow', authorizationToken, user._id);
      return generatePolicy('allow', methodArn, { userId: user._id });
    }
    winston.info('deny', authorizationToken);
    return generatePolicy('deny', methodArn);
  } catch (e) {
    return generatePolicy('deny', methodArn);
  }
};
