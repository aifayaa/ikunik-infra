/* eslint-disable import/no-relative-packages */
import getDocumentUrl from '../lib/getDocumentDataLocation';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;
    const {
      isPublished,
      quality,
      appId: inputAppId,
    } = event.queryStringParameters || {};
    const documentUrl = await getDocumentUrl(id, inputAppId || appId, {
      isPublished,
      quality,
    });
    if (!documentUrl) throw new Error('document_not_found');
    return {
      statusCode: 302,
      body: '',
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
        Location: documentUrl,
      },
    };
  } catch (e) {
    const code = e.message === 'document_not_found' ? 404 : 500;
    return response({ code, message: e.message });
  }
};
