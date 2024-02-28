/* eslint-disable import/no-relative-packages */
import generateApiToken from '../lib/generateApiToken';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }

  try {
    const apiToken = await generateApiToken(userId);
    return response({ code: 200, body: apiToken });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
