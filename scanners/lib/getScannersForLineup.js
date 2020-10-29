import MongoClient from '../../libs/mongoClient';
import getUserLineups from '../../lineup/lib/getUserLineups';

export default async (userId, profileId, lineupId, appId) => {
  const lineup = await getUserLineups(userId, profileId, lineupId, appId);
  if (!lineup) {
    throw new Error('lineup_not_found');
  }
  const client = await MongoClient.connect();
  try {
    const scanners = await client.db(process.env.DB_NAME)
      .collection(process.env.COLL_SCANNERS)
      .find({
        lineupId,
        appId,
      }, { sort: { createdAt: -1 } })
      .toArray();
    return { scanners };
  } finally {
    client.close();
  }
};
