/* eslint-disable import/no-relative-packages */
import getBalances from '../lib/getBalances';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId, profileId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;
  if (userId !== urlId) {
    return response({ code: 403, message: 'Forbidden' });
  }
  try {
    const results = await getBalances(profileId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
