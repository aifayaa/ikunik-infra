import errorMessage from '../../libs/httpResponses/errorMessage';
import getCategories from '../lib/getCategories';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;

  try {
    const results = await getCategories(appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response(errorMessage(e));
  }
};
