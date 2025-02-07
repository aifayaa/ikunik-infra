import MongoClient from '@libs/mongoClient';

type GetSummaryParamsType = {
  fromDate?: Date | null;
  toDate: Date | null;
  getTotalReadingTime?: boolean;
};

type GetSummaryReturnType = {
  users: number;
  singleDevices: number;
  allDevices: number;
  totalReadingTime?: number;
};

export async function getSummary(
  appId: string,
  { fromDate, toDate, getTotalReadingTime }: GetSummaryParamsType
) {
  const client = await MongoClient.connect();

  try {
    const commonQuery: any = {};
    if (fromDate && toDate) {
      commonQuery.createdAt = {
        $gte: fromDate,
        $lte: toDate,
      };
    }
    const users =
      (await client
        .db()
        .collection('users')
        .find({ appId, ...commonQuery })
        .count()) || 0;
    const [{ count: singleDevices = 0 } = {}] = await client
      .db()
      .collection('userMetrics')
      .aggregate([
        { $match: { appId, userId: null, ...commonQuery } },
        { $group: { _id: '$deviceId' } },
        { $count: 'count' },
      ])
      .toArray();
    const [{ count: allDevices = 0 } = {}] = await client
      .db()
      .collection('userMetrics')
      .aggregate([
        { $match: { appId, ...commonQuery } },
        { $group: { _id: '$deviceId' } },
        { $count: 'count' },
      ])
      .toArray();

    const ret: GetSummaryReturnType = {
      users,
      singleDevices,
      allDevices,
    };
    if (getTotalReadingTime) {
      const [{ total: totalReadingTime = 0 } = {}] = await client
        .db()
        .collection('userMetrics')
        .aggregate([
          { $match: { appId, type: 'time', ...commonQuery } },
          { $group: { _id: 'total', total: { $sum: '$time' } } },
        ])
        .toArray();

      ret.totalReadingTime = totalReadingTime;
    }

    return ret;
  } finally {
    await client.close();
  }
}
