import validator from 'validator';
import winston from 'winston';
import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_CREDITS,
} = process.env;

export default async (userID, appId, amount, opts = {}) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('Wrong amount');
  }

  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  try {
    const res = await client.db(DB_NAME).collection(COLL_CREDITS)
      .findOneAndUpdate({
        userID,
        appIds: { $elemMatch: { $eq: appId } },
      }, {
        $inc: {
          credits: -Number(amount),
        },
        $set: {
          updatedAt: new Date(),
          appIds: [appId],
        },
      }, opts).then(r => r.value);
    if (res) {
      if (res.credits < 0) {
        throw new Error('insufficient funds');
      }
      winston.info(`${amount} credits removed to ${userID}`);
      return true;
    }
    throw new Error('No user found');
  } finally {
    client.close();
  }
};
