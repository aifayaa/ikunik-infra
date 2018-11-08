import { MongoClient } from 'mongodb';
import { PromisePoolExecutor } from 'promise-pool-executor';
import uuidv4 from 'uuid/v4';

import getPackage from '../../credits/lib/getPackage';
import getTicketCategory from '../../tickets/lib/getTicketCategory';

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

export default async (
  userId,
  items,
  opts,
) => {
  let totalPrice = 0;
  let totalCredits = 0;

  const pool = new PromisePoolExecutor({
    concurrencyLimit: 2,
  });

  const res = await pool.addEachTask({
    data: items,
    generator: ({ id, type, meta }) => getPricing(id, type, meta),
  }).promise();

  res.forEach((item) => {
    const { qty, price } = item;
    totalCredits += qty;
    totalPrice += price;
  });

  const cartId = uuidv4();
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const cart = {
      _id: cartId,
      date: new Date(),
      items,
      status: 'pending',
      totalCredits,
      totalPrice,
      userId,
    };
    await client.db(process.env.DB_NAME).collection('carts')
      .insertOne(cart, opts);
    return cartId;
  } finally {
    client.close();
  }
};
