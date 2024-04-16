/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import { hasRecoverablePurchasesFor } from '../lib/hasRecoverablePurchasesFor';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const deviceId = event.pathParameters.id;

  try {
    const results = await hasRecoverablePurchasesFor(appId, deviceId, userId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
