import MongoClient from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';

const { COLL_USER_METRICS, COLL_USERS, COLL_PRESS_ARTICLES } = mongoCollections;

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
        .collection(COLL_USERS)
        .find({ appId, ...commonQuery })
        .count()) || 0;
    const [{ count: singleDevices = 0 } = {}] = await client
      .db()
      .collection(COLL_USER_METRICS)
      .aggregate([
        { $match: { appId, userId: null, ...commonQuery } },
        { $group: { _id: '$deviceId' } },
        { $count: 'count' },
      ])
      .toArray();
    const [{ count: allDevices = 0 } = {}] = await client
      .db()
      .collection(COLL_USER_METRICS)
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
        .collection(COLL_USER_METRICS)
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
        .collection(COLL_USER_METRICS)
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
            $lookup: {
              from: COLL_PRESS_ARTICLES,
              localField: '_id',
              foreignField: '_id',
              as: 'article',
            },
          },
          {
            $unwind: {
              path: '$article',
              preserveNullAndEmptyArrays: false,
            },
          },
          {
            $project: {
              _id: 0,
              articleId: '$_id',
              draftId: '$article.draftId',
              isPublished: '$article.isPublished',
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
