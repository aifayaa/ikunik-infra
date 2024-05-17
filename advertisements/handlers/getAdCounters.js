/* eslint-disable import/no-relative-packages */
import getAdCounters from '../lib/getAdCounters';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const allowed = await checkPermsForApp(userId, appId, 'admin');
    if (!allowed) {
      throw new Error('access_forbidden');
    }

    const { _id, campaignId } = event.queryStringParameters;

    if (!_id && !campaignId) throw new Error('missing_argument');

    const counters = await getAdCounters(appId, event.queryStringParameters);
    return response({ code: 200, body: counters });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
