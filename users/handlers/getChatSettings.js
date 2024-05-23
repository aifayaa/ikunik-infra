/* eslint-disable import/no-relative-packages */
import getChatSettings from '../lib/getChatSettings';
import response from '../../libs/httpResponses/response.ts';

export default async (event) => {
  const userId = event.requestContext.authorizer.principalId;
  const { appId } = event.requestContext.authorizer;
  const urlId = event.pathParameters.id;

  try {
    if (userId !== urlId) {
      throw new Error('Forbidden');
    }

    const settings = await getChatSettings(userId, appId);
    if (!settings) {
      return response({ code: 503, message: 'service_unavailable' });
    }
    return response({ code: 200, body: settings });
  } catch (e) {
    let code = 500;
    switch (e.message) {
      case 'Forbidden':
        code = 403;
        break;
      default:
        code = 500;
        break;
    }
    return response({ code, message: e.message });
  }
};
