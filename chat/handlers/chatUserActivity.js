/* eslint-disable import/no-relative-packages */
import chatUserActivity from '../lib/chatUserActivity';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;

  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const { active = false } = bodyParsed;
    await chatUserActivity(userId, appId, active);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
