/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';
import { getPurchasedArticles } from '../lib/getPurchasedArticles';

export default async (event) => {
  try {
    const { queryStringParameters = {}, requestContext } = event;

    const { appId, principalId: userId } = requestContext.authorizer;

    const results = await getPurchasedArticles(
      appId,
      userId,
      queryStringParameters
    );

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
