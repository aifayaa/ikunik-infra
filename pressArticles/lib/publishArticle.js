import { MongoClient } from 'mongodb';

export default async (userId, articleId, draftId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
  let session;

  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };

    const draft = await client
      .db(process.env.DB_NAME)
      .collection('pressDrafts')
      .findOne({ articleId, _id: draftId }, opts);
    if (!draft) {
      throw new Error('Not found');
    }

    const { title, summary, text, md, _id, pictures } = draft;
    await client
      .db(process.env.DB_NAME)
      .collection('pressArticles')
      .updateOne(
        { _id: articleId },
        {
          $set: {
            title,
            summary,
            text,
            md,
            draftId: _id,
            isPublished: true,
            publishedBy: userId,
            pictures,
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

    await client
      .db(process.env.DB_NAME)
      .collection('pressDrafts')
      .updateOne(
        { _id: draftId },
        {
          $set: {
            isPublished: true,
          },
        },
        opts,
      );

    await session.commitTransaction();

    return { articleId, draftId };
  } catch (error) {
    throw error;
  } finally {
    if (session) session.endSession();
    client.close();
  }
};
