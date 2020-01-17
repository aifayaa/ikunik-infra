import MongoClient from '../../libs/mongoClient'
import winston from 'winston';

const {
  COLL_BALANCE_EMAILS,
  COLL_BALANCE_MESSAGES,
  COLL_BALANCE_NOTIFS,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (type, profileId, qte, appId) => {
  let collName;
  switch (type) {
    case 'email':
      collName = COLL_BALANCE_EMAILS;
      break;
    case 'notification':
      collName = COLL_BALANCE_NOTIFS;
      break;
    case 'text':
      collName = COLL_BALANCE_MESSAGES;
      break;
    default:
  }
  const client = await MongoClient.connect();
  try {
    const res = await client.db(DB_NAME).collection(collName)
      .updateOne({
        profil_ID: profileId,
        appIds: {
          $elemMatch: { $eq: appId },
        },
      }, {
        $inc: {
          balance: -Number(qte),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      winston.info(`decrement ${profileId} of ${qte} ${type} tokens`);
      return true;
    }
    throw new Error('No profile found');
  } finally {
    client.close();
  }
};
