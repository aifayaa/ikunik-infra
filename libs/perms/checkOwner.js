import { MongoClient } from 'mongodb';
import response from '../httpResponses/response';

const {
  MONGO_URL,
  DB_NAME,
} = process.env;

export default async (appId, objId, collectionName, collectionField, userId) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const obj = await client
      .db(DB_NAME)
      .collection(collectionName)
      .findOne({
        _id: objId,
        appIds: { $elemMatch: { $eq: appId } },
      });

    if (!obj) {
      return response({ code: 404, message: 'content_not_found' });
    }

    if (obj[collectionField] !== userId) {
      return response({ code: 403, message: 'forbidden_user' });
    }

    return true;
  } finally {
    client.close();
  }
};
