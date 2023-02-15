import { finalizeProfile, finalizeBadge, finalizedUser } from '../lib/finalizeProfile';
import response from '../../libs/httpResponses/response';
import { getUserLanguage } from '../../libs/intl/intl';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    // Only restricting to self for now, should allow admin users later
    if (userId !== urlId) {
      throw new Error('Forbidden');
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
      results.profile = await finalizeProfile(userId, appId, profile);
    }
    if (badge !== null) {
      results.badge = await finalizeBadge(userId, appId, badge);
    }

    const lang = getUserLanguage(event.headers);
    await finalizedUser(userId, appId, lang);

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
