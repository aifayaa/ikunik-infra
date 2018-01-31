import crypto from 'crypto';
import { MongoClient } from 'mongodb';

const doAuthorize = async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const user = await client.db('crowdaaDev').collection('users').findOne(
      { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
      { projection: { _id: 1 } },
    );
    return user._id;
  } finally {
    client.close();
  }
};

const generatePolicy = (Effect, Resource, principalId) => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect,
        Resource,
      },
    ],
  },
});

const hashLoginToken = (loginToken) => {
  const hash = crypto.createHash('sha256');
  hash.update(loginToken);
  return hash.digest('base64');
};

export const handleAuthorize = async ({ authorizationToken, methodArn }, context, callback) => {
  try {
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const userId = await doAuthorize(hashedLoginToken);
    callback(null, generatePolicy('allow', methodArn, userId));
  } catch (e) {
    const response = {
      statusCode: 401,
      message: e.message,
    };
    callback(null, response);
  }
};
