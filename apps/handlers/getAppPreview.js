import errorMessage from '../../libs/httpResponses/errorMessage';
import getAppPreview from '../lib/getAppPreview';
import response from '../../libs/httpResponses/response';

export default async (event) => {
  const { id: previewKey } = event.pathParameters;

  try {
    const app = await getAppPreview(previewKey);

    if (app === false) {
      throw new Error('app_not_found');
    }

    return response({ code: 200, body: app });
  } catch (e) {
    return response(errorMessage(e));
  }
};
