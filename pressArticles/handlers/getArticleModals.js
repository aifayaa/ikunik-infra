/* eslint-disable import/no-relative-packages */
import { getArticleModals } from '../lib/getArticleModals';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { id: articleId } = event.pathParameters;
    const { appId, principalId: userId } = event.requestContext.authorizer;

    const results = await getArticleModals(articleId, appId, {
      userId,
    });

    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
