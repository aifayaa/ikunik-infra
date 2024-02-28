/* eslint-disable import/no-relative-packages */
import getPictureUrl from '../lib/getPictureDataLocation';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;
    const {
      isPublished,
      quality,
      appId: inputAppId,
    } = event.queryStringParameters || {};
    const pictureUrl = await getPictureUrl(id, inputAppId || appId, {
      isPublished,
      quality,
    });
    if (!pictureUrl) throw new Error('picture_not_found');
    return {
      statusCode: 302,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        Location: pictureUrl,
      },
    };
  } catch (e) {
    const code = e.message === 'picture_not_found' ? 404 : 500;
    return response({ code, message: e.message });
  }
};
