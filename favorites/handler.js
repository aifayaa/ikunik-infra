import { MongoClient } from 'mongodb';
import get from 'lodash/get';
import Lambda from 'aws-sdk/clients/lambda';

const MSG = {
  POST: {
    'fr-FR': 'Vous recevrez une notification 15 minutes avant le début du concert',
    'fr-RE': 'Vous recevrez une notification 15 minutes avant le début du concert',
    'us-US': 'You will receive a notification 15 minutes before the show begins',
  },
  DELETE: {
    'fr-FR': 'Vous ne recevrez plus de notification avant le début du concert',
    'fr-RE': 'Vous ne recevrez plus de notification avant le début du concert',
    'us-US': 'You will not receive notification before the show begins',
  },
};

const lambda = new Lambda({
  region: process.env.REGION,
});

export const doGetFavorite = async (userId, artistId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);

  try {
    const data = await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .findOne({ userId, artistId });
    return data;
  } finally {
    client.close();
  }
};

export const doToggleFavorite = async (userId, artistId, isFavorite) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  const favoriteData = {
    userId,
    artistId,
    isFavorite,
    date: new Date(),
  };

  try {
    await client.db(process.env.DB_NAME).collection(process.env.COLL_NAME)
      .update({ userId, artistId }, favoriteData, { upsert: true });
    return true;
  } finally {
    client.close();
  }
};

export const handleFavorite = async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { id } = event.pathParameters;
  let result;

  try {
    switch (event.httpMethod) {
      case 'GET':
        result = await doGetFavorite(userId, id);
        break;
      case 'POST':
        result = await doToggleFavorite(userId, id, true);
        break;
      case 'DELETE':
        result = await doToggleFavorite(userId, id, false);
        break;
      default:
        throw new Error(`METHOD_${event.httpMethod}_NOT_IMPLEMENTED`);
    }
    const response = {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    if (['POST', 'DELETE'].includes(event.httpMethod)) {
      // Notify user after callback
      const user = await lambda.invoke({
        FunctionName: `users-${process.env.STAGE}-getUser`,
        Payload: JSON.stringify({ userId }),
      }).promise();
      const notifyEvent = {
        body: JSON.stringify({ artistName: 'CROWDAA', message: MSG[event.httpMethod][get(JSON.parse(JSON.parse(user.Payload).body), 'locale', 'fr-FR')] }),
        pathParameters: { id: userId },
      };
      console.log('notifyEvent', notifyEvent);
      await lambda.invoke({
        FunctionName: `users-${process.env.STAGE}-blastNotification`,
        Payload: JSON.stringify(notifyEvent),
      }).promise();
    }
    callback(null, response);
  } catch (e) {
    const response = {
      statusCode: 500,
      body: JSON.stringify({ message: e.message }),
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
    };
    callback(null, response);
  }
};
