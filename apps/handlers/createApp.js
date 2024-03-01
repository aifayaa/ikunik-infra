/* eslint-disable import/no-relative-packages */
import createApp from '../lib/createApp';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;

  try {
    if (!userId) {
      throw new Error('malformed_request');
    }

    if (!event.body) {
      throw new Error('malformed_request');
    }

    const { name, protocol } = JSON.parse(event.body);

    const results = await createApp(name, userId, { protocol });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
