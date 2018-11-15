import { MongoClient } from 'mongodb';

export default async () => {
  let client;
  try {
    client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
    const lineups = await client.db(process.env.DB_NAME)
      .collection('lineup')
      .aggregate([
        { $match: { startDate: { $gte: new Date() } } },
        {
          $lookup: {
            from: 'festivals',
            localField: 'festivalId',
            foreignField: '_id',
            as: 'festival',
          },
        },
        {
          $unwind: {
            path: '$festival',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $lookup: {
            from: 'artists',
            localField: 'artistId',
            foreignField: '_id',
            as: 'artist',
          },
        },
        {
          $unwind: {
            path: '$artist',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'stages',
            localField: 'stageId',
            foreignField: '_id',
            as: 'stage',
          },
        },
        {
          $unwind: {
            path: '$stage',
            preserveNullAndEmptyArrays: false,
          },
        },
        { $sort: { startDate: 1, name: 1 } },
      ]).toArray();
    return { lineups };
  } finally {
    client.close();
  }
};
