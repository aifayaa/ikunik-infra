import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
// import { formatMessage, intlInit } from '../../libs/intl/intl';
import { intlInit, formatMessage } from '../../libs/intl/intl';
import { NewsDataIO } from '../../libs/backends/newsdata-io';

const lambda = new Lambda({
  region: process.env.REGION,
});

const {
  COLL_AI_QUERIES,
  COLL_PRESS_AUTOMATION_TASKS,
} = mongoCollections;

// const fieldsList = [
//   { field: 'title', type: 'text' },
//   { field: 'article', type: 'text' },
//   { field: 'articlePicture', type: 'picture' },
// ];

function zeroPad(str) {
  str = `${str}`;
  while (str.length < 3) {
    str = `0${str}`;
  }
  return (str);
}

function getDate() {
  const date = new Date();
  const day = formatMessage(`general:dayOfMonth.${date.getDate()}`);

  const dayAndMonth = formatMessage(`general:dayAndMonth.${date.getMonth()}`, { day });

  return (dayAndMonth);
}

export default async function generateContent(taskId, { appId, userId }) {
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
      timeframe: 48,
    };
    if (taskObj.query) {
      if (taskObj.action === 'summarize') {
        newsDataQuery.q = taskObj.query;
      } else { /* reword */
        newsDataQuery.qInTitle = taskObj.query;
      }
    }

    if (taskObj.country) newsDataQuery.country = taskObj.country;
    if (taskObj.newsCategory) newsDataQuery.category = taskObj.newsCategory;

    const response = await newsDataIo.getNews(newsDataQuery);

    intlInit(taskObj.lang);

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

    const newsTitles = selectedNews.map(({ title }) => (title));
    const newsContents = selectedNews.map(({ content }) => (content.substr(0, 1000)));

    const { customPrompts = {} } = taskObj;

    const customFormatMessage = (key, langKey, vars) => {
      if (!customPrompts[key]) return (formatMessage(langKey, vars));

      const template = customPrompts[key];

      const output = template.replace(/{{([^}]+)}}/g, (match, word) => {
        if (vars[word]) return (vars[word]);
        return (match);
      });

      return (output);
    };

    let query;
    if (taskObj.action === 'summarize') {
      const contentQueries = newsContents.map((news, id) => ({
        field: `article${zeroPad(id + 1)}`,
        prompt: customFormatMessage('summarizeContent', 'pressAutomation:runTask.summary.singleSummary', { news }),
        type: 'text',
      }));

      query = {
        appId,
        userId,
        parts: [
          {
            field: 'title',
            prompt: customFormatMessage('summarizeTitle', 'pressAutomation:runTask.summary.title', { date: getDate(), category: (taskObj.newsCategory || taskObj.query) }),
            type: 'copy',
          },
          {
            field: `article${zeroPad(0)}`,
            prompt: customFormatMessage('summarizeContentShort', 'pressAutomation:runTask.summary.globalSummary', { count: newsTitles.length, newsTitles: newsTitles.join(', ') }),
            type: 'text',
          },
          ...contentQueries,
          {
            field: 'articlePicture',
            prompt: (customPrompts.picture || taskObj.newsCategory || taskObj.query),
            type: 'picture',
          },
        ],
      };
    } else { /* reword */
      const titlesParts = newsTitles.map((title, id) => ({
        field: `title${zeroPad(id)}`,
        prompt: customFormatMessage('rewordTitle', 'pressAutomation:runTask.reword.title', { title }),
        type: 'text',
      }));
      const contentsParts = newsContents.map((news, id) => ({
        field: `article${zeroPad(id)}`,
        prompt: customFormatMessage('rewordContent', 'pressAutomation:runTask.reword.news', { news }),
        type: 'text',
      }));
      const picturesParts = newsTitles.map((_, id) => ({
        field: `articlePicture${zeroPad(id)}`,
        prompt: (customPrompts.picture || taskObj.newsCategory || taskObj.query),
        type: 'picture',
      }));
      query = {
        appId,
        userId,
        parts: [
          ...titlesParts,
          ...contentsParts,
          ...picturesParts,
        ],
      };
    }

    const insertResult = await client
      .db()
      .collection(COLL_AI_QUERIES)
      .insertOne(query);

    const { insertedId } = insertResult;

    await lambda.invokeAsync({
      FunctionName: `ai-${process.env.STAGE}-OpenAI-GenerateContent`,
      InvokeArgs: JSON.stringify({
        queryId: insertedId,
      }),
    }).promise();

    return (insertedId);
  } finally {
    await client.close();
  }
}
