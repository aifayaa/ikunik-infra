import response from '../../libs/httpResponses/response';
import errorMessage from '../../libs/httpResponses/errorMessage';

export default async (event) => {
  try {
    await new Promise((resolve) => {
      console.log('EVENT', event);
      resolve();
    });
    return response({ code: 200, body: { success: true } });
  } catch (e) {
    return response(errorMessage(e));
  }
};
