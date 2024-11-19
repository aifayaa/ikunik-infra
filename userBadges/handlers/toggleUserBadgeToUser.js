/* eslint-disable import/no-relative-packages */
import toggleUserBadgeToUser from '../lib/toggleUserBadgeToUser';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { getUserLanguage } from '../../libs/intl/intl';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;
  const adminUserId = event.requestContext.authorizer.principalId;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const { action, userId: targetUserId } = bodyParsed;

    if (!userBadgeId || !targetUserId) {
      throw new Error('mal_formed_request');
    }

    const lang = getUserLanguage(event.headers);
    const userBadge = await toggleUserBadgeToUser(userBadgeId, appId, {
      action,
      userId: targetUserId,
      adminUserId,
      lang,
    });
    return response({ code: 200, body: { userBadge } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
