/* eslint-disable import/no-relative-packages */
import getTasks from '../lib/getTasks';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

const stringToBool = (str) => str === 'true';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    const params = event.queryStringParameters || {};
    if (!checkPerms(allowedPerms, perms)) {
      throw new Error('access_forbidden');
    }

    const filters = {};

    const { start = 0, limit = 25 } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    const { active = null } = params;

    if (active !== null) filters.active = stringToBool(active);

    const tasks = await getTasks(appId, filters);
    const { list, count } = tasks;

    return response({ code: 200, body: { list, count } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
