import errorMessage from '../../libs/httpResponses/errorMessage';
import getProfile from '../lib/getProfile';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }

  try {
    if (userId !== urlId) {
      return response({ code: 403, message: 'Forbidden' });
    }
    const results = await getProfile(userId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
