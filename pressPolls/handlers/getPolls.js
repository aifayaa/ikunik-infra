/* eslint-disable import/no-relative-packages */
import getPolls from '../lib/getPolls';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    const params = event.queryStringParameters || {};
    const isAdmin = await checkPermsForApp(userId, appId, ['admin'], {
      dontThrow: true,
    });

    const filters = {};

    const { start = 0, limit = 25 } = params;

    filters.start = parseInt(start, 10);
    filters.limit = parseInt(limit, 10);

    if (isAdmin) {
      if (params.search) filters.search = params.search;
    }

    const polls = await getPolls(appId, filters);
    const { count } = polls;
    let { list } = polls;

    if (!isAdmin) {
      const publicFields = [
        '_id',
        'canUpdate',
        'description',
        'displayResults',
        'endDate',
        'multipleChoices',
        'options',
        'requires',
        'startDate',
        'title',
      ];

      list = list.map((item) =>
        publicFields.reduce((acc, key) => {
          acc[key] = item[key];
          return acc;
        }, {})
      );
    }

    return response({ code: 200, body: { list, count } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
