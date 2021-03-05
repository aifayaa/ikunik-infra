import errorMessage from '../../libs/httpResponses/errorMessage';
import getProfile from '../lib/getProfile';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { pathParameters, requestContext } = event;
  const { appId, principalId: userId } = requestContext.authorizer;
  const { id } = pathParameters;

  try {
    if (userId !== id) {
      return response({ code: 403, message: 'Forbidden' });
    }
    const results = await getProfile(userId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
