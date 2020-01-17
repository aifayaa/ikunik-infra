import { MongoClient } from 'mongodb';

const {
  MONGO_URL,
  DB_NAME,
  COLL_PRESS_CATEGORIES,
} = process.env;

export default async (appId, categoryId, name, pathName, color, picture) => {
  /* Mongo client */
  const client = await MongoClient.connect(MONGO_URL, { useUnifiedTopology: true });;

  try {
    const category = {
      name,
      pathName,
    };

    if (color) {
      category.color = color;
    }

    if (picture && picture.length) {
      category.picture = picture.pop();
    }

    const { matchedCount } = await client
      .db(DB_NAME)
      .collection(COLL_PRESS_CATEGORIES)
      .updateOne(
        {
          _id: categoryId,
          appIds: { $elemMatch: { $eq: appId } },
        },
        { $set: category },
      );


    return !!matchedCount;
  } finally {
    client.close();
  }
};
