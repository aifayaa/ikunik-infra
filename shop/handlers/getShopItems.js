import getShopItems from '../lib/getShopItems';
import response from '../../libs/httpResponses/response';

export default async (event, context, callback) => {
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getShopItems(appId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
