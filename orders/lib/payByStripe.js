import Stripe from 'stripe';
import uuidv4 from 'uuid/v4';
import winston from 'winston';
import { MongoClient } from 'mongodb';
import { PromisePoolExecutor } from 'promise-pool-executor';

import addCredits from '../../credits/lib/addCredits';
import buyTickets from '../../tickets/lib/buyTickets';
import sendTicket from '../../tickets/lib/sendTicket';
import updateCart from '../../carts/lib/updateCart';

const {
  STRIPE_API_KEY,
  MONGO_URL,
  DB_NAME,
  COLL_BILLING,
} = process.env;

const stripe = Stripe(STRIPE_API_KEY);

const setupProduct = async (id, type, userId, meta, options) => {
  try {
    switch (type) {
      case 'package':
        return { type, val: null };
      case 'ticket': {
        const { lastName, firstName, email } = meta;
        const mail = await buyTickets(userId, id, lastName, firstName, email, options);
        return { type, val: mail };
      }
      default:
        throw new Error('unknown_product_found');
    }
  } catch (error) {
    throw error;
  }
};

const exeProduct = async (type, val) => {
  try {
    switch (type) {
      case 'package':
        return true;
      case 'ticket':
        return await sendTicket(val);
      default:
        throw new Error('unknown_product_found');
    }
  } catch (error) {
    throw error;
  }
};

export default async (token, cartId, userId) => {
  let client;
  let opts;
  let session;

  const pool = new PromisePoolExecutor({
    concurrencyLimit: 2,
  });

  try {
    client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
    session = client.startSession();
    session.startTransaction();
    opts = { session };
    const cart = await updateCart(cartId, userId, { status: 'pending' }, opts).then(res => res.value);
    if (!cart) throw new Error('cart_not_found');
    const { totalPrice, totalCredits } = cart;
    const billingId = uuidv4();
    const desc = `${totalCredits} credits Crowdaa (${totalPrice}€)`;
    const billing = {
      _id: billingId,
      amount: totalPrice,
      cartId,
      credits: totalCredits,
      date: new Date(),
      desc,
      fees: (totalPrice * 0.03) + 0.3, // 3% du montant + 30cts fees from stripe.com
      provider: 'stripe',
      status: 'paid',
      token,
      userId,
    };
    await client.db(DB_NAME).collection(COLL_BILLING)
      .insertOne(billing, opts);

    // TODO: use appId
    await addCredits(userId, null, `${totalCredits}`, opts);


    // for each item of the cart apply its function
    const setup = await pool.addEachTask({
      data: cart.items || [],
      generator: ({ id, type, meta }) => setupProduct(id, type, userId, meta, opts),
    }).promise();

    const { status } = await stripe.charges.create({
      amount: totalPrice * 100, // x100 because stripe does like this
      currency: 'EUR',
      description: desc,
      source: token.id,
      metadata: {
        billingId,
        totalCredits,
        userId,
      },
    });
    winston.info(`Charged user ${userId}: ${totalPrice} for ${totalCredits} and status ${status}`);
    await session.commitTransaction();

    // now handle non mandatory ops on each item of the cart
    try {
      // for each item of the cart finalise action
      await pool.addEachTask({
        data: setup,
        generator: ({ type, val }) => exeProduct(type, val),
      }).promise();
    } catch (error) {
      winston.warn('Failed to finalise products', error);
    }
    return true;
  } catch (err) {
    if (session) {
      await session.abortTransaction();
    }
    throw err;
  } finally {
    if (session) session.endSession();
    if (client) client.close();
  }
};
