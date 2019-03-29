import { MongoClient } from 'mongodb';

export default async (userId, articleId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    await client
      .db(process.env.DB_NAME)
      .collection('pressArticles')
      .updateOne(
        { _id: articleId },
        {
          $set: {
            isPublished: false,
          },
        },
        opts,
      );

    await client
      .db(process.env.DB_NAME)
      .collection('pressDrafts')
      .updateMany(
        { articleId },
        {
          $set: {
            isPublished: false,
          },
        },
        opts,
      );

    await session.commitTransaction();

    return { articleId };
  } catch (error) {
    throw error;
  } finally {
    if (session) session.endSession();
    client.close();
  }
};
