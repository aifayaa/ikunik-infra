import { MongoClient } from 'mongodb';

import uuidv4 from 'uuid/v4';
import validator from 'validator';

import getUserLineups from '../../lineup/lib/getUserLineups';


export default async (
  lineupId,
  price,
  qty,
  startSale,
  endSale,
  name,
  userId,
  opts,
) => {
  if (!validator.isInt(qty, { min: 1, allow_leading_zeroes: false })) {
    throw new Error('Wrong quantity');
  }
  if (!validator.isInt(price, { min: 0, allow_leading_zeroes: false })) {
    throw new Error('Wrong price');
  }

  const catId = uuidv4();
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const lineup = await getUserLineups(userId, lineupId);
    if (!lineup) {
      throw new Error('lineup_not_found');
    }

    const cat = {
      _id: catId,
      lineupId,
      name,
      price: Number(price),
      quota: Number(qty),
      sold: 0,
      startSale: new Date(startSale),
      endSale: new Date(endSale),
      createdAt: new Date(),
    };
    await client.db(process.env.DB_NAME).collection('ticketCategories')
      .insertOne(cat, opts);
    return catId;
  } finally {
    client.close();
  }
};
