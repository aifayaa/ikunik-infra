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
      } else if (!e.error) {
        throw new Error('backend_error');
      } else if (e.error.code === 'email_send_error') {
        throw new Error('cannot_send_email');
      } else if (e.error.code === 'email_not_found') {
        throw new Error('email_not_found');
      } else {
        throw new Error('backend_error');
      }
    }

    if (!reply) {
      throw new Error('backend_error');
    }
    if (reply.code !== 200) {
      if (reply.message) {
        throw new Error(reply.message);
      }
      throw new Error('invalid_credentials');
    }
  } finally {
    client.close();
  }
};
