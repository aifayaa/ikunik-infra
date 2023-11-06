import getProfile from '../../lib/ghanty/getProfile';
import errorMessage from '../../../libs/httpResponses/errorMessage';
import response from '../../../libs/httpResponses/response';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const body = await getProfile(appId, userId);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
