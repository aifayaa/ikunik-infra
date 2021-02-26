import buildPressPipeline from '../lib/pipelines/pressPipeline';
import searchPress from '../lib/pressSearch';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'search_press';

export default async (event) => {
  try {
    event.queryStringParameters = event.queryStringParameters || {};
    const userId = event.requestContext.authorizer.principalId;
    const { appId, perms } = event.requestContext.authorizer;
    Object.assign(event.queryStringParameters, { filterUserInfo: true });

    const parsedPerms = JSON.parse(perms);
    if (!checkPerms(permKey, parsedPerms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const pipeline = buildPressPipeline(userId, appId, event.queryStringParameters);
    const results = await searchPress(pipeline, appId, event.queryStringParameters);

    return response({ code: 200, body: results });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    return response({ code: 500, message: e.message });
  }
};
