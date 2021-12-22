import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

import getUserLineups from '../../lineup/lib/getUserLineups';

export default async (userId, profileId, scannerId, appId) => {
  const client = await MongoClient.connect();
  let session;
  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };
    const scanner = await client
      .db()
      .collection(mongoCollections.COLL_SCANNERS)
      .findOneAndDelete({
        _id: scannerId,
        appId,
      }, opts)
      .then((res) => res.value);
    if (!scanner) {
      throw new Error('scanner_not_found');
    }

    const { lineupId } = scanner;
    // Check ownership
    const lineup = await getUserLineups(userId, profileId, lineupId, appId);
    if (!lineup) {
      throw new Error('lineup_not_found');
    }

    await session.commitTransaction();

    return true;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    client.close();
    if (session) session.endSession();
  }
};
