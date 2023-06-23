import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const {
  COLL_PRESS_MODALS,
} = mongoCollections;

const publicFields = [
  '_id',
  'articleId',
  'html',
  'maxDisplayCount',
  'title',
  'type',
  'video',
  'zindex',
];

export default async function getBanners(appId, {
  type = null,
  articleId = null,
}, { userId }) {
  const client = await MongoClient.connect();

  try {
    const query = { appId };

    if (type !== null) {
      query.type = type;
    }
    if (articleId !== null) {
      query.articleId = articleId;
    }

    const dbModals = await client
      .db()
      .collection(COLL_PRESS_MODALS)
      .find(query)
      .toArray();

    const modals = dbModals.filter((modal) => {
      if (typeof modal.loggedIn === 'boolean') {
        return ((!modal.loggedIn) === (!userId));
      }

      return (true);
    }).map((modal) => (
      publicFields.reduce((acc, field) => {
        if (modal[field] !== undefined) {
          acc[field] = modal[field];
        }
        return (acc);
      }, {})
    ));

    return (modals);
  } finally {
    client.close();
  }
}
