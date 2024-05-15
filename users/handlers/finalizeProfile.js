/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import {
  finalizeBadge,
  finalizeInternalProfile,
  finalizeProfile,
  finalizedUser,
} from '../lib/finalizeProfile';
import response, { handleException } from '../../libs/httpResponses/response';
import { getUserLanguage } from '../../libs/intl/intl';
import { checkPermsForAppAux } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const urlUserId = event.pathParameters.id;

  const client = MongoClient.connect();
  try {
    const isAdmin = await checkPermsForAppAux(
      client.db(),
      userId,
      appId,
      'admin'
    );

    // Only restricting to self for now, should allow admin users later
    if (userId !== urlUserId && !isAdmin) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);
    const { badge = null, internalProfile = null, profile = null } = bodyParsed;

    const results = {};
    if (internalProfile !== null && isAdmin) {
      results.internalProfile = await finalizeInternalProfile(
        urlUserId,
        appId,
        internalProfile
      );
    }
    if (profile !== null) {
      results.profile = await finalizeProfile(urlUserId, appId, profile);
    }
    if (badge !== null) {
      results.badge = await finalizeBadge(urlUserId, appId, badge);
    }

    if (!isAdmin) {
      const lang = getUserLanguage(event.headers);
      await finalizedUser(urlUserId, appId, lang);
    }

    return response({ code: 200, body: results });
  } catch (exception) {
    return handleException(exception);
  } finally {
    client.close();
  }
};
