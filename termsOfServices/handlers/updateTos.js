/* eslint-disable import/no-relative-packages */
import updateTos from '../lib/updateTos';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { checkPermsForApp } from '../../libs/perms/checkPermsFor.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const tosId = event.pathParameters.id;

  try {
    await checkPermsForApp(userId, appId, ['admin']);

    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const filteredBody = {};
    Object.keys(bodyParsed).forEach((key) => {
      if (key === 'outdated' || key === 'required') {
        if (typeof bodyParsed[key] !== 'boolean') {
          throw new Error('mal_formed_request');
        }
        filteredBody[key] = bodyParsed[key];
      } else if (['title', 'html', 'type', 'url'].indexOf(key) >= 0) {
        if (typeof bodyParsed[key] !== 'string') {
          throw new Error('mal_formed_request');
        }
        if (key === 'type' && ['tos', 'privacy'].indexOf(bodyParsed[key]) < 0) {
          throw new Error('mal_formed_request');
        }
        filteredBody[key] = bodyParsed[key];
      }
    });

    const tos = await updateTos(appId, tosId, userId, filteredBody);
    return response({ code: 200, body: { tos } });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
