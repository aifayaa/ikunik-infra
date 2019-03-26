import uuidv4 from 'uuid/v4';
import { MongoClient } from 'mongodb';

export default async ({ userId, categoryId, title, summary, html, md, xml, pictures }) => {
  if (
    typeof title !== 'string'
    || typeof categoryId !== 'string'
    || typeof summary !== 'string'
    || typeof html !== 'string'
    || !(['string', 'undefined'].indexOf(typeof md) + 1)
    || !(['string', 'undefined'].indexOf(typeof xml) + 1)
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
      pictures,
      summary,
      text: html,
      title,
      userId,
    };
    if (xml) {
      article.xml = xml;
    } else {
      article.md = md;
    }
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
