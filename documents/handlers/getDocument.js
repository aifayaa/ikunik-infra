/* eslint-disable import/no-relative-packages */
import getDocument from '../lib/getDocument';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  try {
    const { id } = event.pathParameters;
    const { appId } = event.requestContext.authorizer;
    const results = await getDocument(
      id,
      appId,
      event.queryStringParameters || {}
    );
    if (!results) throw new Error('document_not_found');
    return response({ code: 200, body: results });
  } catch (e) {
    const code = e.message === 'document_not_found' ? 404 : 500;
    return response({ code, message: e.message });
  }
};
