/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import getApps from '../lib/getApps';

export default async (event) => {
  const { principalId: userId } = event.requestContext.authorizer;
  const { id: urlId } = event.pathParameters;

  try {
    if (userId !== urlId) {
      throw new Error('forbidden');
    }

    const appsResults = await getApps(userId);

    return response({
      code: 200,
      body: { items: appsResults, totalCount: appsResults.length },
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};
