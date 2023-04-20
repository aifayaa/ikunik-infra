import { getArticleShareUrl } from '../lib/getArticleShareUrl';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { id: articleId } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;

    const shareUrl = await getArticleShareUrl(articleId, appId);

    return response({ code: 200, body: { shareUrl } });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
