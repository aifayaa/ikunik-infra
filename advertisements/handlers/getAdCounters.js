import getAdCounters from '../lib/getAdCounters';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const {
      _id,
      campaignId,
    } = event.queryStringParameters;

    if (!_id && !campaignId) throw new Error('missing_argument');

    const counters = await getAdCounters(appId, event.queryStringParameters);
    return response({ code: 200, body: counters });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
