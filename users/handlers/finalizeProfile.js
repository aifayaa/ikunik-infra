import { finalizeProfile, finalizeBadge, finalizedUser } from '../lib/finalizeProfile';
import response from '../../libs/httpResponses/response';
import { getUserLanguage } from '../../libs/intl/intl';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlUserId = event.pathParameters.id;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    // Only restricting to self for now, should allow admin users later
    if (userId !== urlUserId && !checkPerms(allowedPerms, perms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const {
      profile = null,
      badge = null,
    } = bodyParsed;

    const results = {};
    if (profile !== null) {
      results.profile = await finalizeProfile(urlUserId, appId, profile);
    }
    if (badge !== null) {
      results.badge = await finalizeBadge(urlUserId, appId, badge);
    }

    if (!checkPerms(allowedPerms, perms)) {
      const lang = getUserLanguage(event.headers);
      await finalizedUser(urlUserId, appId, lang);
    }

    return response({ code: 200, body: results });
  } catch (e) {
    let code = 500;
    switch (e.message) {
      case 'Forbidden': code = 403; break;
      default: code = 500; break;
    }
    return response({ code, message: e.message });
  }
};
