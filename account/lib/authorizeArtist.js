/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { ADMIN_APP } = process.env;

const { COLL_USERS } = mongoCollections;

export default async (hashedToken, appId) => {
  const client = await MongoClient.connect();
  try {
    const conds = {
      $or: [
        { 'services.resume.loginTokens.hashedToken': hashedToken },
        { 'services.apiTokens.hashedToken': hashedToken },
      ],
    };

    if (appId) {
      conds.appId = { $in: [appId, ADMIN_APP] };
    }

    const user = await client
      .db()
      .collection(COLL_USERS)
      .findOne(conds, { projection: { _id: 1 } });
    return user && user._id;
  } finally {
    client.close();
  }
};
