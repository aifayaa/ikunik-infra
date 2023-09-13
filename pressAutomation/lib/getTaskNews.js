import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { NewsDataIO } from '../../libs/backends/newsdata-io';

const {
  COLL_PRESS_AUTOMATION_TASKS,
} = mongoCollections;

export async function getTaskNewsFromTask(taskObj) {
  const newsDataIo = new NewsDataIO();

  const newsDataQuery = {
    language: taskObj.lang,
    timeframe: taskObj.fetchNewsSince || 48,
  };
  if (taskObj.query) {
    // if (taskObj.action === 'summarize') {
    //   newsDataQuery.q = taskObj.query;
    // } else { /* reword */
    //   newsDataQuery.qInTitle = taskObj.query;
    // }
    newsDataQuery.q = taskObj.query;
  }

  if (taskObj.country) newsDataQuery.country = taskObj.country;
  if (taskObj.newsCategory) newsDataQuery.category = taskObj.newsCategory;

  const response = await newsDataIo.getNews(newsDataQuery);

  const selectedNews = [];

  response.results.forEach((news) => {
    if (news.title && news.content) {
      selectedNews.push(news);
    }
  });

  if (selectedNews.length > taskObj.articlesCount) {
    selectedNews.splice(taskObj.articlesCount);
  } else if (selectedNews.length === 0) {
    throw new Error('no_news_found');
  }

  return (selectedNews);
}

export default async function getTaskNews(taskId, { appId }) {
  const client = await MongoClient.connect();

  try {
    const taskObj = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .findOne({ _id: taskId, appId });

    if (!taskObj) {
      throw new Error('content_not_found');
    }

    const taskNews = await getTaskNewsFromTask(taskObj);

    return (taskNews);
  } finally {
    await client.close();
  }
}
