/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PROJECTS } = mongoCollections;

export default async (
  pipeline,
  { page = 1, limit = 20, coordinates, filterUserInfo }
) => {
  if (page && typeof page !== 'number') page = parseInt(page, 10);
  if (limit && typeof limit !== 'number') limit = parseInt(limit, 10);
  const client = await MongoClient.connect();
  try {
    if (filterUserInfo) {
      pipeline.push({
        $project: {
          _id: 1,
          'user.profile.username': 1,
          hasEmail: {
            $cond: {
              if: {
                $or: [
                  { $ifNull: ['$user.email', false] },
                  { $ifNull: ['$user.profile.email', false] },
                  { $ifNull: ['$user.emails.0.address', false] },
                ],
              },
              then: true,
              else: false,
            },
          },
          hasPhone: {
            $cond: {
              if: {
                $or: [{ $ifNull: ['$user.profile.phone', false] }],
              },
              then: true,
              else: false,
            },
          },
          hasEndpoint: { $ne: ['$endpoints', []] },
          shares: 1,
          user_ID: 1,
          views: 1,
        },
      });
    }
    pipeline.push(
      {
        $group: {
          _id: null,
          fancount: { $sum: 1 },
          crowd: { $push: '$$ROOT' },
        },
      },
      {
        $project: {
          fancount: 1,
          crowd: { $slice: ['$crowd', (page - 1) * limit, limit] },
        },
      }
    );
    const [result] = await client
      .db()
      .collection(coordinates ? 'users' : COLL_PROJECTS)
      .aggregate(pipeline)
      .toArray();
    const { crowd, fancount } = result || { crowd: [], fancount: 0 };
    return { crowd, count: fancount };
  } finally {
    client.close();
  }
};
