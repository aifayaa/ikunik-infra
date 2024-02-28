/* eslint-disable import/no-relative-packages */
import getVideoThumbUrl from '../lib/getVideoThumbLocation';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;
    const { isPublished, appId: inputAppId } =
      event.queryStringParameters || {};
    const videoUrl = await getVideoThumbUrl(id, inputAppId || appId, {
      isPublished,
    });
    if (!videoUrl) throw new Error('video_not_found');
    return {
      statusCode: 302,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        Location: videoUrl,
      },
    };
  } catch (e) {
    const code = e.message === 'video_not_found' ? 404 : 500;
    return response({ code, message: e.message });
  }
};
