import doOptIn from '../lib/optIn';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }
  if (!event.body) {
    throw new Error('mal formed request');
  }

  try {
    const {
      optIn = [],
    } = JSON.parse(event.body);

    if (typeof optIn !== 'object' || !optIn.length) {
      throw new Error('wrong_argument_type');
    }

    const user = await doOptIn(userId, optIn, appId);
    return response({ code: 200, body: user });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
