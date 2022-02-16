import badgeSelfAdd from '../lib/badgeSelfAdd';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    await badgeSelfAdd(appId, userId, userBadgeId);
    return response({ code: 200, body: { success: true } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
