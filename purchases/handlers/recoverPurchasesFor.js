/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import { recoverPurchasesFor } from '../lib/recoverPurchasesFor';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const deviceId = event.pathParameters.id;
  const {
    transfer = 'false',
    assign = 'false',
    user = 'false',
  } = event.queryStringParameters || {};

  try {
    const results = await recoverPurchasesFor(appId, deviceId, userId, {
      transfer: transfer === 'true',
      assign: assign === 'true',
      user: user === 'true',
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
