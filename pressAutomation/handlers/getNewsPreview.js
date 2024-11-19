/* eslint-disable import/no-relative-packages */
import { getTaskNewsFromTask } from '../lib/getTaskNews';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const {
      action,
      articlesCount,
      country,
      fetchNewsSince,
      lang,
      name,
      newsCategory,
      query,
    } = JSON.parse(event.body);

    const newsList = await getTaskNewsFromTask({
      action,
      articlesCount,
      country,
      fetchNewsSince,
      lang,
      name,
      newsCategory,
      query,
    });
    return response({ code: 200, body: newsList || [] });
  } catch (e) {
    return response(errorMessage(e));
  }
};
