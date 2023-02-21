import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

function makeUsernameRegex(search) {
  let ret = search.split('*');

  ret = ret.map((part) => (part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));

  ret = ret.join('.*');

  return (new RegExp(ret, 'i'));
}

export default async (appId, {
  limit = 10,
  onlyPendingBadges = false,
  onlyRejectedBadges = false,
  search = null,
  sortBy,
  sortOrder,
  start,
  userId = null,
}) => {
  const client = await MongoClient.connect();
  try {
    const $match = { appId };
    let $sort = null;
    let $skip = null;
    let $limit = null;
    const pipeline = [];

    if (userId) {
      $match._id = userId;
    }
    if (search) {
      $match['profile.username'] = {
        $regex: makeUsernameRegex(search),
      };
    }
    if (onlyPendingBadges) {
      $match['badges.status'] = 'requested';
    }
    if (onlyRejectedBadges) {
      $match['badges.status'] = 'rejected';
    }

    if (start && typeof start !== 'number') {
      start = parseInt(start, 10) || 0;
    }
    if (limit && typeof limit !== 'number') {
      limit = parseInt(limit, 10);
    }

    if (start) {
      $skip = start;
    }

    $limit = limit || 10;

    if (sortBy) {
      let order = 1;
      if (sortOrder === 'desc') order = -1;
      $sort = { [sortBy]: order };
    }

    pipeline.push({ $match });
    if ($sort) pipeline.push({ $sort });
    if ($skip) pipeline.push({ $skip });
    if ($limit) pipeline.push({ $limit });

    const users = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .aggregate(pipeline)
      .toArray();

    const count = await client
      .db()
      .collection(mongoCollections.COLL_USERS)
      .find($match)
      .count();

    return ({
      users,
      count,
    });
  } finally {
    client.close();
  }
};
