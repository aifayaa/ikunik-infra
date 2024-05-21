/* eslint-disable import/no-relative-packages */
import searchUser from '../lib/searchUser';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  try {
    const { appId, principalId: userId } = event.requestContext.authorizer;
    await checkPermsForApp(userId, appId, ['admin']);

    const {
      limit,
      onlyPendingBadges,
      onlyRejectedBadges,
      search,
      sortBy,
      sortOrder,
      start,
      userId: searchUserId,
    } = event.queryStringParameters || {};
    const results = await searchUser(appId, {
      limit,
      onlyPendingBadges: onlyPendingBadges === 'true',
      onlyRejectedBadges: onlyRejectedBadges === 'true',
      search,
      sortBy,
      sortOrder,
      start,
      userId: searchUserId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
