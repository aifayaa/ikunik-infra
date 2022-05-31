import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import allowedTypes from './blockedContentTypes.json';

const {
  COLL_BLOCKED_CONTENTS,
} = mongoCollections;

export default async (userId, type, contentId, { appId }) => {
  const client = await MongoClient.connect();

  try {
    const db = client.db();

    if (!allowedTypes[type]) {
      throw new Error('malformed_request');
    }

    const alreadyBlocked = await db.collection(COLL_BLOCKED_CONTENTS).findOne({
      appId,
      contentId,
      type,
      userId,
    });

    if (alreadyBlocked) {
      return ({
        _id: alreadyBlocked._id,
        appId,
        contentId,
        type,
      });
    }

    const result = await db.collection(COLL_BLOCKED_CONTENTS).insertOne({
      appId,
      contentId,
      type,
      userId,
    });

    const { insertedId: _id } = result;

    return ({
      _id,
      appId,
      contentId,
      type,
    });
  } finally {
    client.close();
  }
};
