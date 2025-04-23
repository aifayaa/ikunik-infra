/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import getLiveStreams from '../lib/getLiveStreams';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { id, start, limit } = event.queryStringParameters || {};

  try {
    const results = await getLiveStreams(appId, userId, {
      id,
      start,
      limit,
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
