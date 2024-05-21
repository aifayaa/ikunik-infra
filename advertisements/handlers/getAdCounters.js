/* eslint-disable import/no-relative-packages */
import getAdCounters from '../lib/getAdCounters';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    const { _id, campaignId } = event.queryStringParameters;

    if (!_id && !campaignId) throw new Error('missing_argument');

    const counters = await getAdCounters(appId, event.queryStringParameters);
    return response({ code: 200, body: counters });
  } catch (exception) {
    return handleException(exception);
  }
};
