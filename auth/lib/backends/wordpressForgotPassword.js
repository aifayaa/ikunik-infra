import MongoClient from '../../../libs/mongoClient';
import { WordpressAPI } from '../../../libs/backends/wordpress';

export const wordpressForgotPassword = async (email, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);

  try {
    let reply;

    try {
      reply = await wpApi.call('POST', '/crowdaa-sync/v1/users/forgotpassword', {
        email,
      });
    } catch (e) {
      if (!e.response) {
        throw new Error('backend_network_error');
      } else if (e.error && e.error.message) {
        reply = e.error;
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
