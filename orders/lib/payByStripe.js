import { MongoClient } from 'mongodb';
import Stripe from 'stripe';
import uuidv4 from 'uuid/v4';

import addCredits from '../../credits/lib/addCredits';
import getPackage from '../../credits/lib/getPackage';

const stripe = Stripe(process.env.STRIPE_API_KEY);

export default async (token, packageId, userId) => {
  let client;
  let opts;
  let session;

  try {
    const pack = await getPackage(packageId);
    if (!pack) {
      throw new Error('package_not_found');
    }

    const { qty, price } = pack;
    const billingId = uuidv4();
    const desc = `${qty} credits Crowdaa (${price}€)`;

    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    session = client.startSession();
    session.startTransaction();
    opts = { session };
    const billing = {
      _id: billingId,
      amount: price,
      credits: qty,
      date: new Date(),
      desc,
      fees: (price * 0.03) + 0.3,
      provider: 'stripe',
      status: 'paid',
      token,
      userId,
    };
    await client.db(process.env.DB_NAME).collection('billing')
      .insertOne(billing, opts);

    await addCredits(userId, `${qty}`, opts);

    const { status } = await stripe.charges.create({
      amount: price * 100,
      currency: 'EUR',
      description: desc,
      source: token.id,
      metadata: {
        billingId,
        qty,
        userId,
      },
    });

    console.log(`Charged user ${userId}: ${price} for ${qty} and status ${status}`);
    await session.commitTransaction();
    return true;
  } catch (err) {
    if (session) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
    client.close();
  }
};
