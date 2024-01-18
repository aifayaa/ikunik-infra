import getPictures from '../lib/getPictures';
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

    const params = (event.queryStringParameters || {});

    const filters = {};

    const {
      start = 0,
      limit = 30,
    } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    const { count, list } = await getPictures(appId, filters);

    return response({ code: 200, body: { count, list } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
