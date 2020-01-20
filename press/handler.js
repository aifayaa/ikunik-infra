import response from '../libs/httpResponses/response';

export const handleGetPress = () => new Promise((resolve) => {
  resolve(response({ code: 200, body: 'API PRESS OK' }));
});
