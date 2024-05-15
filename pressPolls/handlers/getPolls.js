/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import getPolls from '../lib/getPolls';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForAppAux } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  const client = await MongoClient.connect();
  try {
    const params = event.queryStringParameters || {};
    const isAdmin = await checkPermsForAppAux(
      client.db(),
      userId,
      appId,
      'admin'
    );

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
  } catch (exception) {
    return handleException(exception);
  } finally {
    client.close();
  }
};
