/* eslint-disable import/no-relative-packages */
import getSelfUserBadges from '../lib/getSelfUserBadges';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const body = await getSelfUserBadges(appId, userId);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
