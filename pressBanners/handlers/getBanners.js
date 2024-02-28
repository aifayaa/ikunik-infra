/* eslint-disable import/no-relative-packages */
import errorMessage from '../../libs/httpResponses/errorMessage';
import getBanners from '../lib/getBanners';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { tab } = event.queryStringParameters || {};
    const { appId } = event.requestContext.authorizer;

    const banners = await getBanners(appId, tab);

    return response({ code: 200, body: banners });
  } catch (e) {
    return response(errorMessage(e));
  }
};
