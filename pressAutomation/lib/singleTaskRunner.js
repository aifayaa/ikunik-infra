import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import runTask from './runTask';

const lambda = new Lambda({
  region: process.env.REGION,
});

const {
  COLL_AI_QUERIES,
  COLL_PRESS_AUTOMATION_TASKS,
} = mongoCollections;

async function postArticle({
  autoPublish,
  categoriesId,
  md,
  pictureId,
  title,
}, { appId, userId }) {
  const params = {
    InvocationType: 'Event',
    FunctionName: `pressArticles-${process.env.STAGE}-postArticle`,
    Payload: JSON.stringify({
      body: JSON.stringify({
        categoriesId,
        title,
        md,
        pictures: [pictureId],

        actions: [],
        authorName: '',
        feedPicture: '',
        summary: ' ',
        hideFromFeed: false,
        productId: '',
        videos: [],
        mediaCaptions: '',
        displayOptions: {},
      }),
      headers: {
        'content-type': 'application/json',
      },
      queryStringParameters: { autoPublish: `${autoPublish}` },
      title,
      requestContext: {
        authorizer: {
          perms: JSON.stringify({ pressArticles_all: true }),
          appId,
          principalId: userId,
        },
      },
    }),
  };

  await lambda.invoke(params).promise();
}

async function createArticles(taskObj, generatedContent) {
  const { autoPublish, categories, action } = taskObj;
  const userId = (taskObj.updatedBy || taskObj.createdBy);
  const { appId } = taskObj;

  if (action === 'summarize') {
    const { title, articlePicture } = generatedContent;
    const articleParts = [];
    const articlePartKeys = [];
    Object.keys(generatedContent).forEach((key) => {
      if (key.match(/^article[0-9]+$/)) {
        articlePartKeys.push(key);
      }
    });
    articlePartKeys.sort();
    articlePartKeys.forEach((key) => {
      articleParts.push(generatedContent[key]);
    });
    await postArticle({
      autoPublish,
      categoriesId: categories,
      md: articleParts.join('\n\n'),
      pictureId: articlePicture,
      title,
    }, { appId, userId });
  } else { /* reword */
    const parts = [];

    Object.keys(generatedContent).forEach((key) => {
      const match = key.match(/^(article|title|articlePicture)([0-9]+)$/);
      if (match) {
        const id = parseInt(match[2], 10);
        if (!parts[id]) parts[id] = {};
        parts[id][match[1]] = generatedContent[key];
      }
    });

    const promises = [];
    parts.forEach((itm) => {
      promises.push(postArticle({
        autoPublish,
        categoriesId: categories,
        md: itm.article,
        pictureId: itm.articlePicture,
        title: itm.title,
      }, { appId, userId }));
    });

    await Promise.all(promises);
  }
}

export default async (taskId) => {
  const client = await MongoClient.connect();

  try {
    const taskObj = await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .findOne({ _id: taskId });

    if (!taskObj) return;

    const aiQueryId = await runTask(taskId, {
      appId: taskObj.appId,
      userId: (taskObj.updatedBy || taskObj.createdBy),
    });

    await client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .updateOne({ _id: taskObj._id }, { $set: { autoAIQueryId: aiQueryId } });

    const generationResults = await new Promise((resolve, reject) => {
      const checks = async () => {
        const query = await client
          .db()
          .collection(COLL_AI_QUERIES)
          .findOne({ _id: aiQueryId });

        if (query.error) {
          reject(new Error(query.error.message || query.error));
        } else if (query.processingEndTime) {
          const result = query.parts.reduce((acc, itm) => {
            acc[itm.field] = itm.response;
            return (acc);
          }, {});
          resolve(result);
        } else {
          setTimeout(checks, 5000);
        }
      };

      setTimeout(checks, 5000);
    });

    await createArticles(taskObj, generationResults);
  } finally {
    client.close();
  }
};
