import { MongoClient } from 'mongodb';

export default async (userId, articleId, draftId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });

  try {
    const draft = await client.db(process.env.DB_NAME).collection('pressDrafts')
      .findOne({ articleId, _id: draftId });
    if (!draft) {
      throw new Error('Not found');
    }

    const { title, summary, text, md, _id } = draft;
    await client.db(process.env.DB_NAME).collection('pressDrafts')
      .updateOne({ _id: articleId }, {
        $set: {
          title,
          summary,
          text,
          md,
          draftId: _id,
          isPublished: true,
          publishedBy: userId,
        },
      });

    return { articleId, draftId };
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
};
