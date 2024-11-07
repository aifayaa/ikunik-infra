/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import { hasRecoverablePurchasesFor } from '../lib/hasRecoverablePurchasesFor';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId, principalId: userId } = event.requestContext.authorizer;
  const { id } = event.pathParameters;
  const { user = 'false' } = event.queryStringParameters || {};

  try {
    const results = await hasRecoverablePurchasesFor(appId, id, userId, {
      user: user === 'true',
    });
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
