import validator from 'validator';
import MongoClient from '../../libs/mongoClient';

const {
  DB_NAME,
  COLL_CREDITS,
} = process.env;

// To avoid getting a warning with lint
const jsConsole = console;

export default async (userID, appId, amount, opts = {}) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('wrong_amount');
  }

  opts.upsert = true;

  const client = await MongoClient.connect();
  try {
    await client.db(DB_NAME).collection(COLL_CREDITS)
      .findOneAndUpdate({
        userID,
        appId,
      }, {
        $inc: {
          credits: Number(amount),
        },
        $set: {
          updatedAt: new Date(),
          appId,
        },
      }, opts);
    jsConsole.info(`${amount} credits added to ${userID}`);
  } finally {
    client.close();
  }
};
