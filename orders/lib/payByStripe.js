import { MongoClient } from 'mongodb';
import { PromisePoolExecutor } from 'promise-pool-executor';
import Stripe from 'stripe';
import uuidv4 from 'uuid/v4';

import addCredits from '../../credits/lib/addCredits';
import buyTickets from '../../tickets/lib/buyTickets';
import getPackage from '../../credits/lib/getPackage';
import getTicketCategory from '../../tickets/lib/getTicketCategory';
import sendTicket from '../../tickets/lib/sendTicket';

const stripe = Stripe(process.env.STRIPE_API_KEY);

const getPricing = async (id, type, opts) => {
  try {
    switch (type) {
      case 'package': {
        const pack = await getPackage(id);
        if (!pack) {
          throw new Error('package_not_found');
        }
        const { qty, price } = pack;
        return { qty, price };
      }
      case 'ticket': {
        const ticket = await getTicketCategory(id);
        if (!ticket) {
          throw new Error('ticket_not_found');
        }
        const { price } = ticket;
        if (!opts.email) throw new Error('mal_formed_tickets_meta');
        // Ticket price is in credits
        return { qty: price, price: (price / 10) };
      }
      default:
        throw new Error('unknown_product_found');
    }
  } catch (e) {
    throw e;
  }
};

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

export default async (token, cart, userId) => {
  let client;
  let opts;
  let session;
  let totalCredits = 0;
  let totalPrice = 0;

  const pool = new PromisePoolExecutor({
    concurrencyLimit: 2,
  });

  try {
    const res = await pool.addEachTask({
      data: cart,
      generator: ({ id, type, options }) => getPricing(id, type, options),
    }).promise();

    res.forEach((item) => {
      const { qty, price } = item;
      totalCredits += qty;
      totalPrice += price;
    });

    const billingId = uuidv4();
    const desc = `${totalCredits} credits Crowdaa (${totalPrice}€)`;

    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    session = client.startSession();
    session.startTransaction();
    opts = { session };
    const billing = {
      _id: billingId,
      amount: totalPrice,
      credits: totalCredits,
      date: new Date(),
      desc,
      fees: (totalPrice * 0.03) + 0.3, // 3% du montant + 30cts fees from stripe.com
      provider: 'stripe',
      status: 'paid',
      token,
      userId,
    };
    await client.db(process.env.DB_NAME).collection('billing')
      .insertOne(billing, opts);

    await addCredits(userId, `${totalCredits}`, opts);

    // for each item of the cart apply its function
    const setup = await pool.addEachTask({
      data: cart,
      generator: ({ id, type, options }) => setupProduct(id, type, userId, options, opts),
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
    console.log(`Charged user ${userId}: ${totalPrice} for ${totalCredits} and status ${status}`);
    await session.commitTransaction();

    // now handle non mandatory ops on each item of the cart
    try {
      // for each item of the cart finalise action
      await pool.addEachTask({
        data: setup,
        generator: ({ type, val }) => exeProduct(type, val),
      }).promise();
    } catch (error) {
      console.warn('Failed to finalise products', error);
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
