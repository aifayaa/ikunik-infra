import getTicketCategory from '../lib/getTicketCategory';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const categoryId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getTicketCategory(categoryId, appId);
    if (results) {
      callback(null, response({ code: 200, body: results }));
    } else {
      callback(null, response({ code: 404, message: 'category_not_found' }));
    }
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
