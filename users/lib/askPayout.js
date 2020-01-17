import Lambda from 'aws-sdk/clients/lambda';
import validator from 'validator';
import MongoClient from '../../libs/mongoClient'

import getProfile from './getProfile';
import getPayouts from './getPayouts';
import getPurchases from './getPurchases';
import getPaymentInfoByMethod from './getPaymentInfoByMethod';

const lambda = new Lambda({
  region: process.env.REGION,
});

export default async (userId, profileId, amount, method, appId) => {
  const payouts = await getPayouts(userId, profileId, appId);
  const purchases = await getPurchases(userId, profileId, appId);
  const maxDemand = purchases.total - payouts.totalBaseAmount;
  if (!validator.isInt(amount, {
    min: process.env.MINIMUM_PAYOUT,
    allow_leading_zeroes: false,
    max: maxDemand,
  })) {
    throw new Error('Wrong amount');
  }
  const profile = await getProfile(userId);
  if (!profile) throw new Error('no profile found');

  const params = {
    FunctionName: `fees-${process.env.STAGE}-getFees`,
  };
  const { Payload } = await lambda.invoke(params).promise();
  const res = JSON.parse(Payload);
  if (res.statusCode !== 200) {
    throw new Error(`getFees handler failed: ${res.body}`);
  }
  const feesPercentage = JSON.parse(res.body).globalAvgFees / 100;
  const fees = Number(Math.round(feesPercentage * amount));
  const crowdaa = Number(Math.round(process.env.CROWDAA_FEES * (amount - fees)));
  const payoutData = {
    method,
    userId,
    fees,
    crowdaa,
    date: new Date(),
    baseAmount: Number(amount),
    income: Number((amount - fees - crowdaa)),
    receiver: await getPaymentInfoByMethod(userId, method, profile),
    state: 'pending',
    profileId: profile._id,
  };

  const client = await MongoClient.connect();
  try {
    await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_PAYOUTS)
      .insertOne(payoutData);
    return true;
  } finally {
    client.close();
  }
};
