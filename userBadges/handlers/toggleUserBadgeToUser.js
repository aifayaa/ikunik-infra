import toggleUserBadgeToUser from '../lib/toggleUserBadgeToUser';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { getUserLanguage } from '../../libs/intl/intl';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userBadgeId = event.pathParameters.id;
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const adminUserId = event.requestContext.authorizer.principalId;

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      action,
      userId,
    } = bodyParsed;

    if (!userBadgeId || !userId) {
      throw new Error('mal_formed_request');
    }

    const lang = getUserLanguage(event.headers);
    const userBadge = await toggleUserBadgeToUser(
      userBadgeId,
      appId,
      { action, userId, adminUserId, lang },
    );
    return response({ code: 200, body: { userBadge } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
