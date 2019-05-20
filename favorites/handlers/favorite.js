import get from 'lodash/get';
import Lambda from 'aws-sdk/clients/lambda';
import winston from 'winston';
import getFavorite from '../lib/getFavorite';
import toggleFavorite from '../lib/toggleFavorite';
import response from '../../libs/httpResponses/response';

const {
  REGION,
  STAGE,
} = process.env;

const lambda = new Lambda({
  region: REGION,
});
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

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const { id } = event.pathParameters;
  let result;

  try {
    switch (event.httpMethod) {
      case 'GET':
        result = await getFavorite(userId, id, appId);
        break;
      case 'POST':
        result = await toggleFavorite(userId, id, appId, true);
        break;
      case 'DELETE':
        result = await toggleFavorite(userId, id, appId, false);
        break;
      default:
        throw new Error(`METHOD_${event.httpMethod}_NOT_IMPLEMENTED`);
    }
    if (['POST', 'DELETE'].includes(event.httpMethod)) {
      // Notify user after callback
      const user = await lambda.invoke({
        FunctionName: `users-${STAGE}-getUser`,
        Payload: JSON.stringify({ userId }),
      }).promise();
      const notifyEvent = {
        body: JSON.stringify({
          artistName: 'CROWDAA',
          message: MSG[event.httpMethod][get(JSON.parse(JSON.parse(user.Payload).body), 'locale', 'fr-FR')],
        }),
        pathParameters: { id: userId },
        requestContext: {
          authorizer: event.requestContext.authorizer,
        },
      };
      winston.info('notifyEvent', notifyEvent);
      await lambda.invoke({
        FunctionName: `users-${STAGE}-blastNotification`,
        Payload: JSON.stringify(notifyEvent),
      }).promise();
    }
    callback(null, response({ code: 200, body: result }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
