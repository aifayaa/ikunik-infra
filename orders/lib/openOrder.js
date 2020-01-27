import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import creditsPacks from './creditsPacks.json';

const {
  REGION,
  IOS_FEES,
  DB_NAME,
  COLL_NAME,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});

const computeiOSFees = (amount) => amount * IOS_FEES;

// Assume this is called only by iOS for the moment
export default async (creditPackId, userId) => {
  const packs = creditsPacks[STAGE];
  const pack = packs[creditPackId];
  if (!pack) {
    throw new Error('Unknown credit pack asked');
  }
  const client = await MongoClient.connect();
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

    await client.db(DB_NAME).collection(COLL_NAME)
      .insertOne(billing);

    const params = {
      FunctionName: `credits-${STAGE}-addCredits`,
      // todo: use appId
      Payload: JSON.stringify({ userId, appId: null, amount: `${credits}` }),
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
