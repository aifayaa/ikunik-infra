import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

export default async ({ type, web, mobile, root, appId }) => {
  const { COLL_SELECTIONS } = mongoCollections;
  const client = await MongoClient.connect();
  try {
    const selector = {
      appId,
      isPublished: true,
    };
    if (type && ['audio', 'video'].includes(type)) {
      selector.selectionCollection = type;
    }
    if (web === 'true') {
      selector.isWebPublished = true;
    }
    if (root === 'true') {
      selector.isRoot = true;
    }
    if (mobile !== 'false') {
      selector.isMobilePublished = { $ne: false };
    }
    const selections = await client
      .db()
      .collection(COLL_SELECTIONS)
      .find(selector)
      .sort({ selectionRank: 1 })
      .toArray();

    return { selections };
  } finally {
    client.close();
  }
};
