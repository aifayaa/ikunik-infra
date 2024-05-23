/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import { getTaskNewsFromTask } from './getTaskNews';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
// import { formatMessage, intlInit } from '../../libs/intl/intl';
import { intlInit, formatMessage } from '../../libs/intl/intl';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_AI_QUERIES, COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

const DEFAULT_PICTURE_URL =
  'https://crowdaa.com/wp-content/uploads/2023/09/TC-Crowdaa.png';

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
  return str;
}

function getDate() {
  const date = new Date();
  const day = formatMessage(`general:dayOfMonth.${date.getDate()}`);

  const dayAndMonth = formatMessage(`general:dayAndMonth.${date.getMonth()}`, {
    day,
  });

  return dayAndMonth;
}

export async function runTaskFromData(taskObj, { appId, userId }) {
  const client = await MongoClient.connect();

  try {
    let query;

    if (taskObj.nextArticles && taskObj.nextArticles.length > 0) {
      if (taskObj.action === 'summarize') {
        const currentArticle = taskObj.nextArticles.shift();
        query = {
          appId,
          userId,
          parts: [
            {
              field: 'title',
              prompt: currentArticle.title,
              type: 'copy',
            },
            {
              field: `article${zeroPad(0)}`,
              prompt: currentArticle.content,
              type: 'copy',
            },
            {
              field: 'articlePicture',
              prompt: currentArticle.pictureId,
              type: 'copy',
            },
          ],
        };
      } else {
        /* reword */
        const articles = taskObj.nextArticles.splice(0);
        query = {
          appId,
          userId,
          parts: articles.reduce((acc, currentArticle, id) => {
            acc.push({
              field: `title${zeroPad(id)}`,
              prompt: currentArticle.title,
              type: 'copy',
            });
            acc.push({
              field: `article${zeroPad(id)}`,
              prompt: currentArticle.content,
              type: 'copy',
            });
            acc.push({
              field: `articlePicture${zeroPad(id)}`,
              prompt: currentArticle.pictureId,
              type: 'copy',
            });
            return acc;
          }, []),
        };
      }

      await client
        .db()
        .collection(COLL_PRESS_AUTOMATION_TASKS)
        .updateOne(
          { _id: taskObj._id, appId },
          { $set: { nextArticles: taskObj.nextArticles } }
        );
    } else {
      const selectedNews = await getTaskNewsFromTask(taskObj);

      intlInit(taskObj.lang);

      const newsTitles = selectedNews.map(({ title }) => title);
      const newsContents = selectedNews.map(({ content }) =>
        content.substr(0, 2000)
      );
      const newsPictures = selectedNews.map(
        ({ image_url: imgUrl }) => imgUrl || ''
      );

      const { customPrompts = {} } = taskObj;

      const customFormatMessage = (key, langKey, vars) => {
        if (!customPrompts[key]) return formatMessage(langKey, vars);

        const template = customPrompts[key];

        const output = template.replace(/{{([^}]+)}}/g, (match, word) => {
          if (vars[word]) return vars[word];
          return match;
        });

        return output;
      };

      if (taskObj.action === 'summarize') {
        const contentQueries = newsContents.map((news, id) => ({
          field: `article${zeroPad(id + 1)}`,
          prompt: customFormatMessage(
            'summarizeContent',
            'pressAutomation:runTask.summary.singleSummary',
            { news }
          ),
          type: 'text',
        }));

        query = {
          appId,
          userId,
          parts: [
            {
              field: 'title',
              prompt: customFormatMessage(
                'summarizeTitle',
                'pressAutomation:runTask.summary.title',
                {
                  date: getDate(),
                  category: taskObj.newsCategory || taskObj.query,
                }
              ),
              type: 'copy',
            },
            {
              field: `article${zeroPad(0)}`,
              prompt: customFormatMessage(
                'summarizeContentShort',
                'pressAutomation:runTask.summary.globalSummary',
                { count: newsTitles.length, newsTitles: newsTitles.join(', ') }
              ),
              type: 'text',
            },
            ...contentQueries,
            // {
            //   field: 'articlePicture',
            //   prompt: (customPrompts.picture || taskObj.newsCategory || taskObj.query),
            //   type: 'picture',
            // },
            {
              field: 'articlePicture',
              prompt: JSON.stringify(
                [].concat(newsPictures, DEFAULT_PICTURE_URL)
              ),
              type: 'imagesToIdDownload',
            },
          ],
        };
      } else {
        /* reword */
        const titlesParts = newsTitles.map((title, id) => ({
          field: `title${zeroPad(id)}`,
          prompt: customFormatMessage(
            'rewordTitle',
            'pressAutomation:runTask.reword.title',
            { title }
          ),
          type: 'text',
        }));
        const contentsParts = newsContents.map((news, id) => ({
          field: `article${zeroPad(id)}`,
          prompt: customFormatMessage(
            'rewordContent',
            'pressAutomation:runTask.reword.news',
            { news }
          ),
          type: 'text',
        }));
        // const picturesParts = newsTitles.map((_, id) => ({
        //   field: `articlePicture${zeroPad(id)}`,
        //   prompt: (customPrompts.picture || taskObj.newsCategory || taskObj.query),
        //   type: 'picture',
        // }));
        const picturesParts = newsPictures.map((_, id) => ({
          field: `articlePicture${zeroPad(id)}`,
          prompt: JSON.stringify([newsPictures[id] || DEFAULT_PICTURE_URL]),
          type: 'imagesToIdDownload',
        }));
        query = {
          appId,
          userId,
          parts: [...titlesParts, ...contentsParts, ...picturesParts],
        };
      }
    }

    const insertResult = await client
      .db()
      .collection(COLL_AI_QUERIES)
      .insertOne(query);

    const { insertedId } = insertResult;

    await lambda
      .invokeAsync({
        FunctionName: `ai-${process.env.STAGE}-OpenAI-GenerateContent`,
        InvokeArgs: JSON.stringify({
          queryId: insertedId,
        }),
      })
      .promise();

    return insertedId;
  } finally {
    await client.close();
  }
}

export default async function runTask(taskId, { appId, userId }) {
  const client = await MongoClient.connect();

  try {
    const taskObj = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .findOne({ _id: taskId, appId });

    if (!taskObj) {
      throw new Error('content_not_found');
    }

    const queryId = await runTaskFromData(taskObj, { appId, userId });

    return queryId;
  } finally {
    await client.close();
  }
}
