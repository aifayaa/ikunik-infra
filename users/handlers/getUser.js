import getUser from '../lib/getUser';
import response from '../../libs/httpResponses/response';

export default async ({ userId }, context, callback) => {
  try {
    const results = await getUser(userId);
    callback(null, response({ code: 200, body: results }));
  } catch (e) {
    callback(null, response({ code: 500, message: e.message }));
  }
};
