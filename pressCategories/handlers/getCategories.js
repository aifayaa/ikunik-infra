import getCategories from '../lib/getCategories';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getCategories(appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
