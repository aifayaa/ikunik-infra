/* eslint-disable import/no-relative-packages */
import buildPressPipeline from '../lib/pipelines/pressPipeline';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import searchPress from '../lib/pressSearch';
import { checkPerms } from '../../libs/perms/checkPerms';

const permKey = 'search_press';

export default async (event) => {
  const { queryStringParameters = {} } = event;
  const { appId, perms, principalId: userId } = event.requestContext.authorizer;

  try {
    queryStringParameters.filterUserInfo = true;
    const parsedPerms = JSON.parse(perms);
    if (!checkPerms(permKey, parsedPerms)) {
      return response({ code: 403, message: 'access_forbidden' });
    }

    const pipeline = buildPressPipeline(userId, appId, queryStringParameters);
    const results = await searchPress(pipeline, appId, queryStringParameters);

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
