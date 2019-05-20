import doOptIn from '../lib/optIn';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbidden' }));
    return;
  }
  if (!event.body) {
    throw new Error('mal formed request');
  }

  try {
    const {
      optIn = false,
    } = JSON.parse(event.body);

    const user = await doOptIn(userId, optIn, appId);
    callback(null, response({ code: 200, body: user }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
