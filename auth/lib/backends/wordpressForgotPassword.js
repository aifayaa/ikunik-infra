import MongoClient from '../../../libs/mongoClient';
import { WordpressAPI } from '../../../libs/backends/wordpress';

export const wordpressForgotPassword = async (email, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);

  try {
    let reply;

    try {
      reply = await wpApi.call('POST', '/wp/v2/users/lost-password', {
        email,
      });
    } catch (e) {
      if (!e.response) {
        throw new Error('backend_network_error');
      } else {
        throw new Error('backend_error');
      }
    }

    if (!reply || reply.code !== 200) {
      throw new Error('email_not_found');
    }
  } finally {
    client.close();
  }
};
