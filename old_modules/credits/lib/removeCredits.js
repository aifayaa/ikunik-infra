import validator from 'validator';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_CREDITS } = mongoCollections;

// To avoid getting a warning with lint
const jsConsole = console;

export default async (userID, appId, amount, opts = {}) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('Wrong amount');
  }

  const client = await MongoClient.connect();
  try {
    const res = await client.db().collection(COLL_CREDITS)
      .findOneAndUpdate({
        userID,
        appId,
      }, {
        $inc: {
          credits: -Number(amount),
        },
        $set: {
          updatedAt: new Date(),
          appId,
        },
      }, opts).then((r) => r.value);
    if (res) {
      if (res.credits < 0) {
        throw new Error('insufficient funds');
      }
      jsConsole.info(`${amount} credits removed to ${userID}`);
      return true;
    }
    throw new Error('No user found');
  } finally {
    client.close();
  }
};
