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
