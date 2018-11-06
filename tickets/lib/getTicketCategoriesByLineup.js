import { MongoClient } from 'mongodb';

const ticketCategoriesFields = {
  _id: 1,
  lineupId: 1,
  name: 1,
  price: 1,
  startSale: 1,
  endSale: 1,
  createdAt: 1,
  quota: 1,
  sold: 1,
};

export default async (lineupId, userId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    let ticketCategories;
    if (userId) {
      const aggregate = [
        {
          $match: {
            lineupId,
            removed: { $ne: true },
          },
        },
        {
          $lookup: {
            from: 'lineup',
            localField: 'lineupId',
            foreignField: '_id',
            as: 'lineup',
          },
        },
        {
          $unwind: {
            path: '$lineup',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $lookup: {
            from: 'artists',
            localField: 'lineup.artistId',
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
            from: 'users',
            localField: 'artist.profil_ID',
            foreignField: 'profil_ID',
            as: 'user',
          },
        },
        {
          $unwind: {
            path: '$artist',
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $match: {
            'user._id': userId,
          },
        },
        {
          $lookup: {
            from: 'tickets',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'scanned',
          },
        },
        {
          $project: {
            ...ticketCategoriesFields,
            scanned: {
              $size: {
                $filter: {
                  input: '$scanned',
                  as: 'ticket',
                  cond: {
                    $ne: ['$$ticket.scanStatus', 0],
                  },
                },
              },
            },
          },
        },
      ];
      ticketCategories = await client.db(process.env.DB_NAME)
        .collection('ticketCategories')
        .aggregate(aggregate)
        .toArray();
    } else {
      ticketCategories = await client.db(process.env.DB_NAME)
        .collection('ticketCategories')
        .find({
          lineupId,
          removed: { $ne: true },
        })
        .toArray();
    }
    return { ticketCategories };
  } finally {
    client.close();
  }
};
