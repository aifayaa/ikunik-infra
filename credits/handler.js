import { MongoClient } from 'mongodb';
import validator from 'validator';

function makeResponse(statusCode, error, result) {
  const res = {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  if (error) {
    res.body = error.message;
    return res;
  }
  res.body = JSON.stringify(result);
  return res;
}

const doGetCredits = async (userID) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const credits = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ userID });
    return credits;
  } finally {
    client.close();
  }
};

const doAddCredits = async (userID, amount) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('Wrong amount');
  }

  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const res = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne({ userID }, {
        $inc: {
          credits: +Number(amount),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      console.log(`${amount} credits added to ${userID}`);
      return true;
    }
    throw new Error('No user found');
  } finally {
    client.close();
  }
};

const doRemoveCredits = async (userID, amount) => {
  if (!validator.isInt(amount, { min: 0, allow_leading_zeroes: false, max: 999 })) {
    throw new Error('Wrong amount');
  }

  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const res = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne({ userID }, {
        $inc: {
          credits: -Number(amount),
        },
        $set: {
          updatedAt: new Date(),
        },
      }, { upsert: true });
    if (res.upsertedCount === 1 || res.modifiedCount === 1) {
      console.log(`${amount} credits removed to ${userID}`);
      return true;
    }
    throw new Error('No user found');
  } finally {
    client.close();
  }
};

export const handleGetCredits = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const results = await doGetCredits(userId);
    callback(null, makeResponse(200, null, results));
  } catch (e) {
    callback(null, makeResponse(500, e));
  }
};

// TODO make auth on top of this method
// only authorize internal requester (our services only)
export const handleAddCredits = async ({ userId, amount }, context, callback) => {
  try {
    const results = await doAddCredits(userId, amount);
    callback(null, makeResponse(200, null, results));
  } catch (e) {
    callback(null, makeResponse(500, e));
  }
};

export const handleRemoveCredits = async ({ userId, amount }, context, callback) => {
  try {
    const results = await doRemoveCredits(userId, amount);
    callback(null, makeResponse(200, null, results));
  } catch (e) {
    callback(null, makeResponse(500, e));
  }
};
