/* eslint-disable import/no-relative-packages */
import getBrands from '../lib/getBrands';
import errorMessage from '../../libs/httpResponses/errorMessage';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const { appId } = event.requestContext.authorizer;

  try {
    const body = await getBrands(appId);
    return response({ code: 200, body });
  } catch (e) {
    return response(errorMessage(e));
  }
};
