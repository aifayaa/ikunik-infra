import { MongoClient } from 'mongodb';
import Lambda from 'aws-sdk/clients/lambda';

const lambda = new Lambda({
  region: process.env.REGION,
});

function makeResponse(statusCode, error, result) {
  const res = {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
  };
  if (error) {
    res.body = error.message;
    return res;
  }
  res.body = JSON.stringify(result);
  return res;
}

const doGetMedium = async (userId, mediumType, mediumId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let mediaCol;
    switch (mediumType) {
      case 'audio':
        mediaCol = process.env.COLL_AUDIOS;
        break;
      case 'video':
        mediaCol = process.env.COLL_VIDEOS;
        break;
      default:
        throw new Error('wrong type');
    }
    const medium = await client.db(process.env.DB_NAME).collection(mediaCol)
      .findOne({ _id: mediumId });
    if (!medium) throw new Error('medium not found');
    const params = {
      FunctionName: `subscriptions-${process.env.STAGE}-isUserSubscribed`,
      Payload: JSON.stringify({ userId, subIds: medium.subscriptionIds }),
    };
    const { Payload } = await lambda.invoke(params).promise();
    const { body } = JSON.parse(Payload);
    if (!JSON.parse(body)) {
      delete medium.url;
      delete medium.video480Url;
      medium.isLocked = true;
    }
    return medium;
  } finally {
    client.close();
  }
};

const doPostMediumView = async (userId, mediumType, mediumId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    let mediaCol;
    switch (mediumType) {
      case 'audio':
        mediaCol = process.env.COLL_AUDIOS;
        break;
      case 'video':
        mediaCol = process.env.COLL_VIDEOS;
        break;
      default:
        throw new Error('wrong type');
    }
    const { value } = await client.db(process.env.DB_NAME).collection(mediaCol)
      .findOneAndUpdate({ _id: mediumId }, {
        $inc: { views: 1 },
        $set: { lastView: new Date() },
      });
    if (!value) throw new Error('medium not found');
    await client.db(process.env.DB_NAME).collection('Project')
      .updateOne({ _id: value.project_ID }, {
        $inc: { views: 1 },
        $set: { lastView: new Date() },
      });
    await client.db(process.env.DB_NAME).collection('contentByUserMetric')
      .updateOne({ user_ID: userId, content_ID: mediumId }, {
        $inc: { views: 1 },
        $set: { date: new Date(), collection: mediaCol },
      }, { upsert: true });

    // update the total number for Crowdaa
    // Historic code
    await client.db(process.env.DB_NAME).collection('metrics')
      .updateOne({ _id: '3FD4vNCuXXxtjN3fD' }, {
        $inc: { views: 1 },
      });
    await client.db(process.env.DB_NAME).collection('views')
      .updateOne({ userID: userId, content_ID: mediumId }, {
        $inc: { numviews: 1 },
      }, { upsert: true });
    return true;
  } finally {
    client.close();
  }
};

export const handleGetMedium = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await doGetMedium(userId, mediumType, mediumId);
    callback(null, makeResponse(200, null, results));
  } catch (e) {
    callback(null, makeResponse(500, e));
  }
};

export const handlePostMediumView = async (event, context, callback) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const mediumType = event.pathParameters.type;
    const mediumId = event.pathParameters.id;
    const results = await doPostMediumView(userId, mediumType, mediumId);
    const response = {
      statusCode: 200,
      body: JSON.stringify(results),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
    };
    callback(null, response);
  }
};
