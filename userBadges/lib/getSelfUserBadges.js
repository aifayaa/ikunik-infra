import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_USERS,
  COLL_USER_BADGES,
} = mongoCollections;

export default async (appId, userId) => {
  const client = await MongoClient.connect();

  try {
    const user = await client.db().collection(COLL_USERS).findOne({ _id: userId, appId });
    const userBadges = user.badges || [];

    const allBadges = await client
      .db()
      .collection(COLL_USER_BADGES)
      .find({
        appId,
        $or: [
          {
            management: { $in: ['request', 'public'] },
          },
          {
            management: 'private-visible',
            _id: { $in: userBadges.map(({ id }) => (id)) },
          },
        ],
      })
      .toArray();

    const ownedBadges = userBadges.reduce((acc, itm) => {
      if (!itm.requested) {
        acc[itm.id] = true;
      }
      return (acc);
    }, {});

    const requestedBadges = userBadges.reduce((acc, itm) => {
      if (itm.requested) {
        acc[itm.id] = true;
      }
      return (acc);
    }, {});

    const filteredBadges = allBadges.map(({
      _id,
      name,
      description,
      color,
      management,
    }) => {
      const ret = {
        _id,
        name,
        description,
        color,
        management,
      };

      if (ownedBadges[_id]) {
        ret.owned = true;
      }
      if (requestedBadges[_id]) {
        ret.requested = true;
      }

      return (ret);
    });

    return (filteredBadges);
  } finally {
    client.close();
  }
};
