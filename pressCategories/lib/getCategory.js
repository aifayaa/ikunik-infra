import MongoClient from '../../libs/mongoClient';

const { COLL_PRESS_CATEGORIES, DB_NAME } = process.env;

export default async (appId, catId) => {
  const client = await MongoClient.connect();
  const collection = client.db(DB_NAME).collection(COLL_PRESS_CATEGORIES);

  try {
    const categoryWithParent = await collection
      .aggregate([
        {
          $match: {
            appId,
            _id: catId,
          },
        },
        {
          $graphLookup: {
            from: COLL_PRESS_CATEGORIES,
            startWith: '$parentId',
            connectFromField: 'parentId',
            connectToField: '_id',
            as: 'parentCategories',
          },
        },
      ])
      .toArray();
    const category = categoryWithParent.length ? categoryWithParent[0] : null;
    return category;
  } finally {
    client.close();
  }
};
