import MongoClient from '../../libs/mongoClient';

const {
  COLL_ARTISTS,
  COLL_LINEUPS,
  COLL_TICKETS,
  COLL_TICKET_CATEGORIES,
  COLL_USERS,
  DB_NAME,
} = process.env;

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

export default async (lineupId, userId, appId) => {
  const client = await MongoClient.connect();
  try {
    let ticketCategories;
    if (userId) {
      const aggregate = [
        {
          $match: {
            lineupId,
            appId,
            removed: { $ne: true },
          },
        },
        {
          $lookup: {
            from: COLL_LINEUPS,
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
            from: COLL_ARTISTS,
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
            from: COLL_USERS,
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
            from: COLL_TICKETS,
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
      ticketCategories = await client.db(DB_NAME)
        .collection(COLL_TICKET_CATEGORIES)
        .aggregate(aggregate)
        .toArray();
    } else {
      ticketCategories = await client.db(DB_NAME)
        .collection(COLL_TICKET_CATEGORIES)
        .find({
          lineupId,
          appId,
          removed: { $ne: true },
        })
        .toArray();
    }
    return { ticketCategories };
  } finally {
    client.close();
  }
};
