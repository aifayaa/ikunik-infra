/* eslint-disable import/no-relative-packages */
import vote from '../lib/vote';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;
  const userId = event.requestContext.authorizer.principalId;
  const iapPollId = event.pathParameters.id;

  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    if (!bodyParsed.votes || !(bodyParsed.votes instanceof Array)) {
      throw new Error('mal_formed_request');
    }
    if (!bodyParsed.deviceId) {
      throw new Error('mal_formed_request');
    }

    const voted = await vote(
      iapPollId,
      appId,
      userId,
      bodyParsed.deviceId,
      bodyParsed.votes
    );
    return response({ code: 200, body: { voted } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
