/* eslint-disable import/no-relative-packages */
import getBlasts from '../lib/getBlasts';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const userId = event.requestContext.authorizer.principalId;
    const { appId } = event.requestContext.authorizer;
    const results = await getBlasts(
      userId,
      appId,
      event.queryStringParameters || {}
    );
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
