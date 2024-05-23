/* eslint-disable import/no-relative-packages */
import response from '../libs/httpResponses/response.ts';

export const handleGetAdmin = () =>
  new Promise((resolve) => {
    resolve(
      response({
        code: 200,
        body: 'API ADMIN OK',
      })
    );
  });
