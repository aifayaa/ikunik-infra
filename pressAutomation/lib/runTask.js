import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
// import { formatMessage, intlInit } from '../../libs/intl/intl';
import { intlInit } from '../../libs/intl/intl';
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

    const contentQueries = [];

    newsContents.forEach((news, id) => {
      contentQueries.push({
        field: `article${zeroPad(id + 1)}`,
        prompt: `Briefly summarize this article in markdown format : ${news}`,
        type: 'text',
      });
    });

    const query = {
      appId,
      userId,
      parts: [
        {
          field: 'title',
          prompt: `15th may news summary about sports in ${taskObj.query}`,
          type: 'copy',
        },
        {
          field: 'article0',
          prompt: `Briefly summarize these ${newsTitles.length} news titles, one per line : ${newsTitles.join(', ')}`,
          type: 'text',
        },
        ...contentQueries,
        {
          field: 'articlePicture',
          prompt: 'Sports',
          type: 'picture',
        },
      ],
      // parts: fieldsList.map(({ field, type }) => {
      //   const tsKey = userPrompts[field] ? 'custom' : 'generic';
      //   const aiPrompt = formatMessage(`pressAutomation:generateContent.${tsKey}.${field}`, {
      //     userPrompt: (userPrompts && userPrompts[field]) || '',
      //   });

      //   return ({
      //     field,
      //     prompt: aiPrompt,
      //     type,
      //   });
      // }),
    };

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
