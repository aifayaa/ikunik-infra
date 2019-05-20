import getCategory from '../lib/getCategory';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const catId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getCategory(appId, catId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
