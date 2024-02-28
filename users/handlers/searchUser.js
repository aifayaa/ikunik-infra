/* eslint-disable import/no-relative-packages */
import searchUser from '../lib/searchUser';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];
export default async (event) => {
  try {
    const { appId } = event.requestContext.authorizer;
    const perms = JSON.parse(event.requestContext.authorizer.perms);
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const {
      limit,
      onlyPendingBadges,
      onlyRejectedBadges,
      search,
      sortBy,
      sortOrder,
      start,
      userId,
    } = event.queryStringParameters || {};
    const results = await searchUser(appId, {
      limit,
      onlyPendingBadges: onlyPendingBadges === 'true',
      onlyRejectedBadges: onlyRejectedBadges === 'true',
      search,
      sortBy,
      sortOrder,
      start,
      userId,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
