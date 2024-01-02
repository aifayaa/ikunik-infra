import mongoCollections from '../../libs/mongoCollections.json';
import response from '../../libs/httpResponses/response';
import getBadge from '../lib/getUserBadge';
import { unsetContentPermissions } from '../../contentPermissions/lib/unsetContentPermissions';
import toggleUserBadgeToUser from '../lib/toggleUserBadgeToUser';

const { COLL_USER_BADGES } = mongoCollections;

export default async (event) => {
  const badgeId = event.pathParameters.id;
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { deviceId = null } = (event.queryStringParameters || {});

  try {
    const badge = await getBadge(badgeId, appId);

    if (!badge) {
      throw new Error('badge_not_found');
    }

    const results = await unsetContentPermissions(
      appId,
      userId,
      deviceId,
      badgeId,
      COLL_USER_BADGES,
    );

    await toggleUserBadgeToUser(badgeId, appId, { action: 'remove', userId });

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
