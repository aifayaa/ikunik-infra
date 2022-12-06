import getTicketCategory from '../lib/getTicketCategory';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const categoryId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getTicketCategory(categoryId, appId);
    if (results) {
      return response({ code: 200, body: results });
    }
    return response({ code: 404, message: 'category_not_found' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
