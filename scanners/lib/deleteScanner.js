import { MongoClient } from 'mongodb';

import getUserLineups from '../../lineup/lib/getUserLineups';

export default async (userId, scannerId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  let session;
  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };
    const scanner = await client.db(process.env.DB_NAME).collection('scanners')
      .findOneAndDelete({
        _id: scannerId,
      }, opts).then(res => res.value);
    if (!scanner) {
      throw new Error('scanner_not_found');
    }

    const { lineupId } = scanner;
    // Check ownership
    const lineup = await getUserLineups(userId, lineupId);
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
