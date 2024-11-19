/* eslint-disable import/no-relative-packages */
import register from '../lib/register';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;

  try {
    if (!event.body) {
      throw new Error('mal_formed_request');
    }

    const bodyParsed = JSON.parse(event.body);

    const res = await register(appId, bodyParsed);

    return response({ code: 200, body: res });
  } catch (e) {
    return response(errorMessage(e));
  }
};
