/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import getPollResults, { pollResultsToCsv } from '../lib/getPollResults';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { getUserLanguage, intlInit } from '../../libs/intl/intl';

const allowedPerms = ['pressArticles_all'];

export default async (event) => {
  const perms = JSON.parse(event.requestContext.authorizer.perms);
  const pollId = event.pathParameters.id;

  try {
    const isAdmin = checkPerms(allowedPerms, perms);

    const { exportToken = null, appId } = event.queryStringParameters || {};

    if (!isAdmin && !exportToken) {
      throw new Error('access_forbidden');
    }

    const lang = getUserLanguage(event.headers);

    const pollResults = await getPollResults(pollId, appId, exportToken);

    await intlInit(lang);

    const csv = pollResultsToCsv(pollResults);
    return response({
      code: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
      },
      body: csv,
      raw: true,
    });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
