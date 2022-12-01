import response from '../libs/httpResponses/response';

export const handleGetAdmin = () => new Promise((resolve) => {
  resolve(response({
    code: 200,
    body: 'API ADMIN OK',
  }));
});
