import getShopItem from '../lib/getShopItem';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const itemId = event.pathParameters.id;
  const { appId } = event.requestContext.authorizer;
  try {
    const results = await getShopItem(itemId, appId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
