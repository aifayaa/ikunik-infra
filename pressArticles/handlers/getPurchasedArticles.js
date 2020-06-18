import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response';
import { checkPerms } from '../../libs/perms/checkPerms';
import { getPurchasedArticles } from '../lib/getPurchasedArticles';

const permKey = 'pressArticles_all';

export default async (event) => {
  try {
    const {
      queryStringParameters = {},
      requestContext,
    } = event;

    const {
      appId,
      perms,
      principalId: userId,
    } = requestContext.authorizer;

    const permissionsParsed = JSON.parse(perms);

    if (!checkPerms(permKey, permissionsParsed)) {
      throw new Error('access_forbidden');
    }

    const results = await getPurchasedArticles(
      appId,
      userId,
      queryStringParameters,
    );

    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
