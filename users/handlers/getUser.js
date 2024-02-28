/* eslint-disable import/no-relative-packages */
import getUser from '../lib/getUser';
import response from '../../libs/httpResponses/response';

export default async ({ userId }) => {
  try {
    const results = await getUser(userId);
    return response({ code: 200, body: results });
  } catch (e) {
    return response({ code: 500, message: e.message });
  }
};
