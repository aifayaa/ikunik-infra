/* eslint-disable import/no-relative-packages */
import getUserMetrics from '../lib/getUserMetrics';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const userMetricsId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;

  try {
    if (typeof userMetricsId !== 'string') {
      throw new Error('Wrong argument type');
    }

    const results = await getUserMetrics(appId, userMetricsId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
