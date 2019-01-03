import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';
import creditsPacks from './creditsPacks.json';

const lambda = new Lambda({
  region: process.env.REGION,
});

const computeiOSFees = amount => amount * process.env.IOS_FEES;

// Assume this is called only by iOS for the moment
const doOpenOrder = async (creditPackId, userId) => {
  const packs = creditsPacks[process.env.STAGE];
  const pack = packs[creditPackId];
  if (!pack) {
    throw new Error('Unknown credit pack asked');
  }
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const { price, credits } = pack;
    const billing = {
      userId,
      desc: `${credits} credits Crowdaa ($${price})`,
      amount: price,
      fees: computeiOSFees(price),
      credits,
      date: new Date(),
      provider: 'apple',
      status: 'paid',
    };

    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .insertOne(billing);

    const params = {
      FunctionName: `credits-${process.env.STAGE}-addCredits`,
      Payload: JSON.stringify({ userId, amount: `${credits}` }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const res = JSON.parse(Payload);
    if (res.statusCode !== 200) {
      throw new Error(`addCredits handler failed: ${res.body}`);
    }
    return true;
  } finally {
    client.close();
  }
};

export const handleOpenOrder = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { creditPackId } = JSON.parse(event.body);
    if (!creditPackId) {
      throw new Error('mal formed request');
    }
    const results = await doOpenOrder(creditPackId, userId);
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
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
