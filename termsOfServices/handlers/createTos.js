/* eslint-disable import/no-relative-packages */
import createTos from '../lib/createTos';
import response, { handleException } from '../../libs/httpResponses/response';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const {
      title,
      html,
      type = 'tos',
      outdated = false,
      required = true,
      url = '',
    } = JSON.parse(event.body);

    if (!title || !html) {
      throw new Error('mal_formed_request');
    }
    if (['tos', 'privacy'].indexOf(type) < 0) {
      throw new Error('mal_formed_request');
    }

    const newTos = await createTos(appId, title, html, {
      userId,
      type,
      outdated,
      required,
      url,
    });
    return response({ code: 200, body: { tos: newTos } });
  } catch (exception) {
    return handleException(exception);
  }
};
