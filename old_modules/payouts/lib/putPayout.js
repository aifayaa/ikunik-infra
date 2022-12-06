import Lambda from 'aws-sdk/clients/lambda';
import validator from 'validator';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import getPayout from './getPayout';

const {
  REGION,
  STAGE,
} = process.env;

const { COLL_PAYOUTS } = mongoCollections;

const lambda = new Lambda({
  region: REGION,
});

export default async (id, resp, appId) => {
  const client = await MongoClient.connect();
  try {
    const payout = await getPayout(id, appId);
    if (!payout) throw new Error('payout not found');

    const { income, state, method, receiver } = payout;
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
      };
    } else if (state === 'processing') {
      patch = {
        state: 'done',
        paidAt: new Date(),
      };
    } else if (state === 'pending') {
      if (method === 'paypal') {
        patch = {
          state: 'processing',
          validatedAt: new Date(),
        };
      }
      if (method === 'credits') {
        patch = {
          state: 'done',
          paidAt: new Date(),
        };
        const params = {
          FunctionName: `credits-${STAGE}-addCredits`,
          Payload: JSON.stringify({ userId: receiver, appId, amount: `${income}` }),
        };

        const { Payload } = await lambda.invoke(params).promise();
        const res = JSON.parse(Payload);
        if (res.statusCode !== 200) {
          throw new Error(`addCredits handler failed: ${res.body}`);
        }
      }
    }

    await client
      .db()
      .collection(COLL_PAYOUTS)
      .updateOne({ _id: id, appId }, { $set: patch });
    return true;
  } finally {
    client.close();
  }
};
