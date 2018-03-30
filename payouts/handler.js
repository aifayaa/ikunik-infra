import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';
import validator from 'validator';

const lambda = new Lambda({
  region: process.env.REGION,
});

const doGetPayouts = async () => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {
      state: { $in: ['processing', 'pending'] },
    };

    const payouts = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .find(selector).toArray();
    return { payouts };
  } finally {
    client.close();
  }
};

const doGetPayout = async (id) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const selector = {
      _id: id,
    };

    return await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne(selector);
  } finally {
    client.close();
  }
};

const doPutPayout = async (id, resp) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const payout = await doGetPayout(id);
    if (!payout) throw new Error('payout not found');

    const {income, state, method, receiver } = payout;
    if (!validator.isIn(state, ['processing', 'pending'])) {
      throw new Error('invalid payout state');
    }

    if (!validator.isIn(method, ['paypal', 'credits'])) {
      throw new Error('payout method not supported yet');
    }

    let patch;

    // reject
    if (!resp) {
      patch = {
        state: 'rejected',
        rejectedAt: new Date(),
      }
    } else if (state === 'processing') {
      patch = {
        state: 'done',
        paidAt: new Date(),
      }
    } else if (state === 'pending') {
      if (method === 'paypal') {
        patch = {
          state: 'processing',
          validatedAt: new Date(),
        }
      }
      if (method === 'credits') {
        patch = {
          state: 'done',
          paidAt: new Date(),
        }
        const params = {
          FunctionName: `credits-${process.env.STAGE}-addCredits`,
          Payload: JSON.stringify({ userId: receiver, amount: `${income}` }),
        };

        const { Payload } = await lambda.invoke(params).promise();
        const res = JSON.parse(Payload);
        if (res.statusCode !== 200) {
          throw new Error(`addCredits handler failed: ${res.body}`);
        }
      }
    }

    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .updateOne({ _id: id }, { $set: patch });    
    return true;
  } finally {
    client.close();
  }
};

export const handleGetPayouts = async (event, context, callback) => {
  try {
    const results = await doGetPayouts();
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
    };
    callback(null, response);
  }
};

export const handlePutPayout = async (event, context, callback) => {
  try {
    const { id, resp } = JSON.parse(event.body);
    if (!id || typeof(resp) !== 'boolean') {
      throw new Error('mal formed request');
    }
    const results = await doPutPayout(id, resp);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify(e.message),
    };
    callback(null, response);
  }
};
