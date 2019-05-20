import { MongoClient } from 'mongodb';
import winston from 'winston';

export default async (type, profileId, qty, appId) => {
  let collName;
  switch (type) {
    case 'email':
      collName = process.env.COLL_BALANCE_EMAILS;
      break;
    case 'notification':
      collName = process.env.COLL_BALANCE_NOTIFS;
      break;
    case 'text':
      collName = process.env.COLL_BALANCE_MESSAGES;
      break;
    default:
  }
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const res = await client
      .db(process.env.DB_NAME)
      .collection(collName)
      .updateOne({
        profil_ID: profileId,
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        $inc: {
          balance: Number(qty),
        },
        $set: {
          updatedAt: new Date(),
        },
        $addToSet: {
          appIds: appId,
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      winston.info(`increment ${profileId} of ${qty} ${type} tokens`);
      return true;
    }
    throw new Error('No profile found');
  } finally {
    client.close();
  }
};
