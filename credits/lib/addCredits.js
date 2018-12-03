import { MongoClient } from 'mongodb';
import validator from 'validator';

export default async (userID, amount, opts = {}) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('wrong_amount');
  }

  opts.upsert = true;

  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    await client.db(process.env.DB_NAME).collection('credits')
      .findOneAndUpdate({ userID }, {
        $inc: {
          credits: Number(amount),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, opts);

    console.log(`${amount} credits added to ${userID}`);
  } finally {
    client.close();
  }
};
