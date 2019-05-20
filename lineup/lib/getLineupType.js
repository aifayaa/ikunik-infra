import { MongoClient } from 'mongodb';

const {
  COLL_ARTISTS,
  COLL_FESTIVALS,
  COLL_LINEUPS,
  COLL_PICTURES,
  COLL_STAGES,
  DB_NAME,
  MONGO_URL,
} = process.env;

export default async (someId, type, appId) => {
  const client = await MongoClient.connect(MONGO_URL);
  try {
    const selector = {
      appIds: { $elemMatch: { $eq: appId } },
      endDate: { $gte: new Date() },
      [type]: someId,
    };
    const lineup = await client
      .db(DB_NAME)
      .collection(COLL_LINEUPS)
      .aggregate([
        { $match: selector },
        {
          $lookup: {
            from: COLL_FESTIVALS,
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
            from: COLL_ARTISTS,
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
            from: COLL_STAGES,
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
        {
          $lookup: {
            from: COLL_PICTURES,
            localField: 'pictureId',
            foreignField: '_id',
            as: 'pictures',
          },
        },
        {
          $unwind: {
            path: '$pictures',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $addFields: { img: '$pictures.pictureUrl' },
        },
        {
          $project: {
            pictures: 0,
          },
        },
        { $sort: { startDate: 1, name: 1 } },
      ]).toArray();
    return { lineup };
  } finally {
    client.close();
  }
};
