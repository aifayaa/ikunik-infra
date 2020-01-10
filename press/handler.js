import response from '../libs/httpResponses/response';

export const handleGetPress = async (event) => {
  try {
    return response({ code: 200, body: 'API PRESS OK' });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
