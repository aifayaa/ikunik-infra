import { MongoClient } from 'mongodb';
import getUserLineups from '../../lineup/lib/getUserLineups';

export default async (userId, lineupId) => {
  const lineup = await getUserLineups(userId, lineupId);
  if (!lineup) {
    throw new Error('lineup_not_found');
  }
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const scanners = await client.db(process.env.DB_NAME)
      .collection('scanners')
      .find({ lineupId }, { sort: { createdAt: -1 } }).toArray();
    return { scanners };
  } finally {
    client.close();
  }
};
