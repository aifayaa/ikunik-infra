import editProfile from '../lib/editProfile';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { pathParameters, requestContext } = event;
  const { appId, principalId: userId } = requestContext.authorizer;
  const { id } = pathParameters;

  try {
    // Only restricting to self for now, should allow admin users later
    if (userId !== id) {
      throw new Error('Forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      avatar,
      username,
    } = bodyParsed;

    if (!username) {
      throw new Error('mal_formed_request');
    }

    if (typeof username !== 'string') {
      throw new Error('wrong_argument_type');
    }

    if (username.length < 2) {
      throw new Error('username too short');
    }

    if (avatar && typeof avatar !== 'string') {
      throw new Error('wrong_argument_type');
    }

    const results = await editProfile(userId, appId, bodyParsed);
    return response({ code: 200, body: { updated: results } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
