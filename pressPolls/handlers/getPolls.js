import getPolls from '../lib/getPolls';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const perms = JSON.parse(event.requestContext.authorizer.perms);

  try {
    const params = (event.queryStringParameters || {});
    const isAdmin = checkPerms(allowedPerms, perms);

    const filters = {};

    const {
      start = 0,
      limit = 25,
      search,
    } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    if (isAdmin) {
      if (search) filters.search = search;
    }

    const polls = await getPolls(appId, filters);
    const { count } = polls;
    let { list } = polls;

    if (!isAdmin) {
      const publicFields = [
        '_id',
        'title',
        'description',
        'options',
        'startDate',
        'endDate',
        'requires',
        'multipleChoices',
        'displayResults',
        'canUpdate',
        'publishedAt',
      ];

      list = list.map((item) => (publicFields.reduce((acc, key) => {
        acc[key] = item[key];
        return (acc);
      }, {})));
    }

    return response({ code: 200, body: { list, count } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
