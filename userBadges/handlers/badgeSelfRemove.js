/* eslint-disable import/no-relative-packages */
import badgeSelfRemove from '../lib/badgeSelfRemove';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    await badgeSelfRemove(appId, userId, userBadgeId);
    return response({ code: 200, body: { success: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
