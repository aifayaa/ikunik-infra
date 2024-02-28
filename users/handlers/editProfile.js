/* eslint-disable import/no-relative-packages */
import editProfile from '../lib/editProfile';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    // Only restricting to self for now, should allow admin users later
    if (userId !== urlId) {
      throw new Error('forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const { username } = bodyParsed;

    if (!username) {
      throw new Error('mal_formed_request');
    }

    if (typeof username !== 'string') {
      throw new Error('wrong_argument_type');
    }

    if (username.length < 2) {
      throw new Error('username too short');
    }

    const results = await editProfile(userId, appId, bodyParsed);
    return response({ code: 200, body: { updated: results } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
