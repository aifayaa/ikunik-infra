import { MongoClient } from 'mongodb';
import validator from 'validator';

export default async (userID, amount, opts = {}) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('Wrong amount');
  }

  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const res = await client.db(process.env.DB_NAME).collection('credits')
      .findOneAndUpdate({ userID }, {
        $inc: {
          credits: -Number(amount),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, opts).then(r => r.value);
    if (res) {
      if (res.credits < 0) {
        throw new Error('insufficient funds');
      }
      console.log(`${amount} credits removed to ${userID}`);
      return true;
    }
    throw new Error('No user found');
  } finally {
    client.close();
  }
};
