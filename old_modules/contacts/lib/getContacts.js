import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  DEFAULT_LIMIT,
  LIMIT_MAX,
} = process.env;

const {
  COLL_CONTACTS,
} = mongoCollections;

export default async (_userId, profileId, appId, {
  idsOnly, filter, limit, search, skip, sortBy, sortOrder, type,
}) => {
  const client = await MongoClient.connect();
  try {
    const selector = {
      invitedByProfil_ID: profileId,
      appId,
    };
    // FIXME: $text need complete words, regex slow performances
    // if (search) selector.$text = { $search: search };
    if (search) {
      selector.$or = [
        { firstname: { $regex: search, $options: 'i' } },
        { lastname: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { cleandedPhoneNumber: { $regex: search, $options: 'i' } },
      ];
    }
    if (type === 'email') selector.email = { $exists: true };
    if (type === 'text') selector.cleandedPhoneNumber = { $exists: true };
    if (filter) {
      const contactIDs = JSON.parse(decodeURIComponent(filter));
      selector._id = { $in: contactIDs };
    }
    const opts = {};
    if (idsOnly) {
      opts.fields = { _id: 1 };
    } else {
      opts.limit = DEFAULT_LIMIT | 0;
      if (limit) {
        opts.limit = limit | 0;
        if (opts.limit > LIMIT_MAX | 0) throw new Error(`above ${LIMIT_MAX} contacts limit`);
      }
      if (skip) opts.skip = skip | 0;
      if (sortBy && sortOrder) opts.sort = { [sortBy]: (sortOrder === 'desc' ? 1 : -1) };
    }
    const [contacts, totalCount] = await Promise.all([
      client.db()
        .collection(COLL_CONTACTS)
        .find(selector, opts)
        .toArray(),
      client.db()
        .collection(COLL_CONTACTS)
        .find(selector, opts)
        .count(),
    ]);
    return { contacts, totalCount };
  } finally {
    client.close();
  }
};
