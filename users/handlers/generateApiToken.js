import generateApiToken from '../lib/generateApiToken';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const userId = event.requestContext.authorizer.principalId;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    callback(null, response({ code: 403, message: 'Forbidden' }));
    return;
  }

  try {
    const apiToken = await generateApiToken(userId);
    callback(null, response({ code: 200, body: apiToken }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
