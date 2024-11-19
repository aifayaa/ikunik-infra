/* eslint-disable import/no-relative-packages */
import chatMessageSent from '../lib/chatMessageSent';
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

    if (!bodyParsed.roomId) throw new Error('mal_formed_request');
    if (typeof bodyParsed.message !== 'string')
      throw new Error('mal_formed_request');
    if (typeof bodyParsed.haveAttachments !== 'boolean')
      throw new Error('mal_formed_request');
    if (!bodyParsed.message && !bodyParsed.haveAttachments)
      throw new Error('mal_formed_request');

    await chatMessageSent(userId, appId, bodyParsed);
    return response({ code: 200, body: { ok: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
