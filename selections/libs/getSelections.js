import MongoClient from '../../libs/mongoClient';

export default async ({ type, web, mobile, root, appId }) => {
  const { DB_NAME, COLL_SELECTIONS } = process.env;
  const client = await MongoClient.connect();
  try {
    const selector = {
      appIds: appId,
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
      .db(DB_NAME)
      .collection(COLL_SELECTIONS)
      .find(selector)
      .sort({ selectionRank: 1 })
      .toArray();

    return { selections };
  } finally {
    client.close();
  }
};
