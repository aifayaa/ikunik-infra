/* eslint-disable import/no-relative-packages */
import badgeSelfRequest from '../lib/badgeSelfRequest';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;

  try {
    if (!userId) {
      throw new Error('forbidden');
    }

    const lang = getUserLanguage(event.headers);

    await badgeSelfRequest(appId, userId, userBadgeId, { lang });
    return response({ code: 200, body: { success: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
