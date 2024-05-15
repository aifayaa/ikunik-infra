/* eslint-disable import/no-relative-packages */
import getAds from '../lib/getAds';
import response, { handleException } from '../../libs/httpResponses/response';
import MongoClient from '../../libs/mongoClient';
import { checkPermsForAppAux } from '../../libs/perms/checkPermsFor';

const stringToBool = (str) => str === 'true';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const params = event.queryStringParameters || {};
    const client = await MongoClient.connect();
    const db = client.db();
    const isAdmin = await checkPermsForAppAux(db, userId, appId, 'admin');

    const filters = {};

    const { start = 0, limit = 25, location = null } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);
    if (location !== null) filters.location = location;

    if (isAdmin) {
      const { active = null, campaignId = null, isActiveNow = null } = params;

      if (active !== null) filters.active = stringToBool(active);
      if (campaignId !== null) filters.campaignId = campaignId;
      if (isActiveNow !== null) filters.isActiveNow = stringToBool(isActiveNow);
    } else {
      filters.isActiveNow = true;
    }

    const ads = await getAds(appId, filters);
    const { count } = ads;
    let { list } = ads;

    if (!isAdmin) {
      list = list.map(
        ({
          _id,
          format,
          location: loc,
          locationOpts,
          media,
          mediaType,
          url,
        }) => ({
          _id,
          format,
          location: loc,
          locationOpts,
          media,
          mediaType,
          url,
        })
      );
    }

    return response({ code: 200, body: { list, count } });
  } catch (exception) {
    return handleException(exception);
  }
};
