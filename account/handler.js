import { MongoClient } from 'mongodb';
import winston from 'winston';

import generatePolicy from './lib/generatePolicy';
import hashLoginToken from './lib/hashLoginToken';

const doAuthorize = async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const user = await client.db('crowdaaDev').collection('users').findOne(
      { 'services.resume.loginTokens': { $elemMatch: { hashedToken } } },
      { projection: { _id: 1 } },
    );
    return user;
  } finally {
    client.close();
  }
};

const doAuthorizeAdmin = async (hashedToken) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const user = await client.db('crowdaaDev').collection('users').findOne(
      {
        'services.resume.loginTokens': { $elemMatch: { hashedToken } },
        'profile.isSuperAdmin': true,
      },
      { projection: { _id: 1 } },
    );
    return user._id;
  } finally {
    client.close();
  }
};

export const handleAuthorize = async ({ authorizationToken, methodArn }, context, callback) => {
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const user = await doAuthorize(hashedLoginToken);
    if (user) {
      winston.info('allow', authorizationToken, user._id);
      return callback(null, generatePolicy('allow', methodArn, user._id));
    }
    winston.info('deny', authorizationToken);
    return callback(null, generatePolicy('deny', methodArn, null));
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    return callback(null, response);
  }
};

export const handleAuthorizeAdmin = async ({ authorizationToken, methodArn }, context
  , callback) => {
  try {
    winston.info(authorizationToken, methodArn);
    const loginToken = authorizationToken.split(' ')[1];
    const hashedLoginToken = hashLoginToken(loginToken);
    const userId = await doAuthorizeAdmin(hashedLoginToken);
    winston.info(userId);
    callback(null, generatePolicy('allow', methodArn, userId));
  } catch (e) {
    const response = {
      statusCode: 401,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
