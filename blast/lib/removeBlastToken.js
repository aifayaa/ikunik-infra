import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_BALANCE_EMAILS,
  COLL_BALANCE_MESSAGES,
  COLL_BALANCE_NOTIFS,
} = mongoCollections;

// To avoid getting a warning with lint
const jsConsole = console;

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
    const res = await client.db().collection(collName)
      .updateOne({
        profil_ID: profileId,
        appId,
      }, {
        $inc: {
          balance: -Number(qte),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      jsConsole.info(`decrement ${profileId} of ${qte} ${type} tokens`);
      return true;
    }
    throw new Error('No profile found');
  } finally {
    client.close();
  }
};
