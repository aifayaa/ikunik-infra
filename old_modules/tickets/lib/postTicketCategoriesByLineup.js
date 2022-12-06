import uuidv4 from 'uuid/v4';
import validator from 'validator';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

import getUserLineups from '../../lineup/lib/getUserLineups';

export default async (
  lineupId,
  price,
  qty,
  startSale,
  endSale,
  name,
  userId,
  profileId,
  appId,
  opts,
) => {
  if (!validator.isInt(qty, { min: 1, allow_leading_zeroes: false })) {
    throw new Error('Wrong quantity');
  }
  if (!validator.isInt(price, { min: 0, allow_leading_zeroes: false })) {
    throw new Error('Wrong price');
  }

  const catId = uuidv4();
  const client = await MongoClient.connect();
  try {
    const lineup = await getUserLineups(userId, profileId, lineupId, appId);
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
      appId,
    };
    await client
      .db()
      .collection(mongoCollections.COLL_TICKET_CATEGORIES)
      .insertOne(cat, opts);
    return catId;
  } finally {
    client.close();
  }
};
