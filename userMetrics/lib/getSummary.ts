import MongoClient from '@libs/mongoClient';

export async function getSummary(appId: string) {
  const client = await MongoClient.connect();

  try {
    const users =
      (await client.db().collection('users').find({ appId }).count()) || 0;
    const [{ count: singleDevices = 0 } = {}] = await client
      .db()
      .collection('userMetrics')
      .aggregate([
        { $match: { appId, userId: null } },
        { $group: { _id: '$deviceId' } },
        { $count: 'count' },
      ])
      .toArray();
    const [{ count: allDevices = 0 } = {}] = await client
      .db()
      .collection('userMetrics')
      .aggregate([
        { $match: { appId } },
        { $group: { _id: '$deviceId' } },
        { $count: 'count' },
      ])
      .toArray();

    return {
      users,
      singleDevices,
      allDevices,
    };
  } finally {
    await client.close();
  }
}
