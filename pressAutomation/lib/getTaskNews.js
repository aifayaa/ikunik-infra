import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { intlInit } from '../../libs/intl/intl';
import { NewsDataIO } from '../../libs/backends/newsdata-io';

const {
  COLL_PRESS_AUTOMATION_TASKS,
} = mongoCollections;

export default async function generateContent(taskId, { appId }) {
  const client = await MongoClient.connect();
  const newsDataIo = new NewsDataIO();

  try {
    const taskObj = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .findOne({ _id: taskId, appId });

    if (!taskObj) {
      throw new Error('content_not_found');
    }

    const newsDataQuery = {
      language: taskObj.lang,
    };
    if (taskObj.query) {
      newsDataQuery.q = taskObj.query;
    }

    newsDataQuery.category = 'sports';
    newsDataQuery.country = 'us';

    const response = await newsDataIo.getNews(newsDataQuery);

    intlInit(taskObj.lang);

    const selectedNews = [];

    response.results.forEach((news) => {
      if (news.title && news.content) {
        selectedNews.push({
          title: news.title,
          content: news.content,
        });
      }
    });

    if (selectedNews.length > taskObj.articlesCount) {
      selectedNews.splice(taskObj.articlesCount);
    } else if (selectedNews.length === 0) {
      throw new Error('no_news_found');
    }

    return (selectedNews);
  } finally {
    await client.close();
  }
}
