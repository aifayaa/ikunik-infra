import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';

export default async (userId, articleId, categoryId, title, summary, html, md) => {
  if (
    typeof title !== 'string'
    || typeof articleId !== 'string'
    || typeof categoryId !== 'string'
    || typeof summary !== 'string'
    || typeof html !== 'string'
    || typeof md !== 'string'
  ) {
    throw new Error('bad arguments');
  }

  const draftId = uuidv4();
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const { _id } = await client.db(process.env.DB_NAME).collection('pressDrafts')
      .findOne({ articleId }, { sort: { createdAt: -1 } });
    const draft = {
      _id: draftId,
      categoryId,
      title,
      summary,
      text: html,
      md,
      userId,
      createdAt: new Date(),
      isPublished: false,
      articleId,
      ancestor: _id,
    };

    await client.db(process.env.DB_NAME).collection('pressDrafts')
      .insertOne(draft);

    return { articleId, draftId };
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
};
