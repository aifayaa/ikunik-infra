import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';

export default async (userId, categoryId, title, summary, html, md, pictures) => {
  if (
    typeof title !== 'string'
    || typeof categoryId !== 'string'
    || typeof summary !== 'string'
    || typeof html !== 'string'
    || typeof md !== 'string'
    || !Array.isArray(pictures)
  ) {
    throw new Error('bad arguments');
  }
  const articleId = uuidv4();
  const draftId = uuidv4();
  let session;
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const article = {
      _id: articleId,
      categoryId,
      createdAt: new Date(),
      draftId,
      isPublished: false,
      md,
      pictures,
      summary,
      text: html,
      title,
      userId,
    };
    session = client.startSession();
    session.startTransaction();
    const opts = { session, returnOriginal: false };
    await client.db(process.env.DB_NAME).collection('pressArticles')
      .insertOne(article, opts);

    delete article.draftId;
    article.articleId = articleId;
    article._id = draftId;
    article.ancestor = null;
    await client.db(process.env.DB_NAME).collection('pressDrafts')
      .insertOne(article, opts);

    await session.commitTransaction();
    return { articleId, draftId };
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) session.endSession();
    client.close();
  }
};
