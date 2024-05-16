/* eslint-disable import/no-relative-packages */
import getTasks from '../lib/getTasks';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

const stringToBool = (str) => str === 'true';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const params = event.queryStringParameters || {};
    await checkPermsForApp(userId, appId, ['admin']);

    const filters = {};

    const { start = 0, limit = 25 } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    const { active = null } = params;

    if (active !== null) filters.active = stringToBool(active);

    const tasks = await getTasks(appId, filters);
    const { list, count } = tasks;

    return response({ code: 200, body: { list, count } });
  } catch (exception) {
    return handleException(exception);
  }
};
