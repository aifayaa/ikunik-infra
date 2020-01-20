import MongoClient from '../../libs/mongoClient';

export default async (_userId, profileId, contactListId, appId, {
  limit, skip, sortBy, sortOrder,
} = {}) => {
  const {
    COLL_ARTIST_CONTACT_LIST,
    DB_NAME,
  } = process.env;
  const client = await MongoClient.connect();
  try {
    const opts = {};
    opts.limit = limit | 0;
    if (skip) opts.skip = skip;
    if (sortBy && sortOrder) opts.sort = { [sortBy]: (sortOrder === 'desc' ? 1 : -1) };

    let aggregation = [
      {
        $match: {
          _id: contactListId,
          profil_ID: profileId,
          appIds: { $elemMatch: { $eq: appId } },
        },
      },
      {
        $unwind: {
          path: '$contactIDs',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'contacts',
          localField: 'contactIDs',
          foreignField: '_id',
          as: 'contact',
        },
      },
    ];
    if (opts.sort) aggregation.push({ $sort: opts.sort });
    if (opts.skip) aggregation.push({ $skip: opts.skip });
    if (opts.limit) aggregation.push({ $limit: opts.limit });
    aggregation = aggregation.concat([{
      $unwind: {
        path: '$contact',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $group: {
        _id: '_id',
        contacts: { $addToSet: '$contact' },
        contactListName: { $first: 'contactListName' },
        date: { $first: 'date' },
        profil_ID: { $first: 'profil_ID' },
        type: { $first: 'type' },
        user_ID: { $first: 'user_ID' },
      },
    }]);
    const contactList = await client
      .db(DB_NAME)
      .collection(COLL_ARTIST_CONTACT_LIST)
      .aggregate(aggregation).toArray();
    return contactList[0];
  } finally {
    client.close();
  }
};
