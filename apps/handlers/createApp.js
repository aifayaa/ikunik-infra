/* eslint-disable import/no-relative-packages */
import createApp from '../lib/createApp';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';

const { ADMIN_APP } = process.env;

export default async (event) => {
  const appId = event.pathParameters.id;
  const userId = event.requestContext.authorizer.principalId;

  try {
    if (!appId || !userId || appId !== ADMIN_APP) {
      throw new Error('malformed_request');
    }

    if (!event.body) {
      throw new Error('malformed_request');
    }

    const { name } = JSON.parse(event.body);

    const results = await createApp(name, userId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage({ message: e.message }));
  }
};
