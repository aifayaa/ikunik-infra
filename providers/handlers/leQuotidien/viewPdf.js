import viewPdf from '../../lib/leQuotidien/viewPdf';
import response from '../../../libs/httpResponses/response';
import errorMessage from '../../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    const { pdfId } = event.pathParameters;
    const { appId, userId, loginToken } = event.requestContext.authorizer;

    if (!appId) throw new Error('app_not_found');
    if (!userId || !loginToken) throw new Error('not_connected');

    const pdfUrl = await viewPdf(pdfId, { appId, userId, loginToken });

    return ({
      statusCode: 302,
      body: '',
      headers: {
        // 'Access-Control-Allow-Origin': '*',
        // 'Access-Control-Allow-Credentials': true,
        Location: pdfUrl,
      },
    });
  } catch (e) {
    return response(errorMessage(e));
  }
};
