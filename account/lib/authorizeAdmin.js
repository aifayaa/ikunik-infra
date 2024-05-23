/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { ADMIN_APP } = process.env;

const { COLL_USERS } = mongoCollections;

export default async (hashedToken) => {
  const client = await MongoClient.connect();
  try {
    const usersCollection = client.db().collection(COLL_USERS);

    const conds = {
      $or: [
        { 'services.resume.loginTokens.hashedToken': hashedToken },
        { 'services.apiTokens.hashedToken': hashedToken },
      ],
      appId: ADMIN_APP,
    };

    const user = await usersCollection.findOne(conds, {
      projection: {
        _id: 1,
        'services.resume.loginTokens': 1,
      },
    });

    return user;
  } finally {
    client.close();
  }
};
