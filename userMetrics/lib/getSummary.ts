import MongoClient from '@libs/mongoClient';

type GetSummaryParamsType = {
  fromDate?: Date | null;
  toDate: Date | null;
  getTotalReadingTime?: boolean;
  getTimePerArticle?: boolean;
};

type TimePerArticleArrayType = Array<{
  articleId: string;
  sum: number;
  avg: number;
}>;

type GetSummaryReturnType = {
  users: number;
  singleDevices: number;
  allDevices: number;
  totalReadingTime?: number;
  timePerArticle?: TimePerArticleArrayType;
};

export async function getSummary(
  appId: string,
  {
    fromDate,
    toDate,
    getTotalReadingTime,
    getTimePerArticle,
  }: GetSummaryParamsType
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

    if (getTimePerArticle) {
      const timePerArticle = (await client
        .db()
        .collection('userMetrics')
        .aggregate([
          { $match: { appId, type: 'time', ...commonQuery } },
          {
            $group: {
              _id: {
                $concat: [
                  '$contentId',
                  '|',
                  { $ifNull: ['$userId', '$deviceId'] },
                ],
              },
              articleId: { $first: '$contentId' },
              timeSum: { $sum: '$time' },
            },
          },
          {
            $group: {
              _id: '$articleId',
              sum: { $sum: '$timeSum' },
              avg: { $avg: '$timeSum' },
            },
          },
          {
            $project: {
              _id: 0,
              articleId: '$_id',
              sum: 1,
              avg: 1,
            },
          },
        ])
        .toArray()) as TimePerArticleArrayType;

      ret.timePerArticle = timePerArticle;
    }

    return ret;
  } finally {
    await client.close();
  }
}
