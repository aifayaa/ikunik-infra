/* eslint-disable import/no-relative-packages */
import MongoClient from '../../../libs/mongoClient';
import { WordpressAPI } from '../../../libs/backends/wordpress';

export const wordpressForgotPassword = async (email, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);

  try {
    let reply;

    try {
      reply = await wpApi.call(
        'POST',
        '/crowdaa-sync/v1/users/forgotpassword',
        {
          email,
        }
      );
    } catch (e) {
      console.log('DEBUG wpForgot e', e, { email, appId: app._id });
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
      console.log('DEBUG wpForgot noreply', { email, appId: app._id });
      throw new Error('backend_error');
    }
    if (reply.code !== 200) {
      console.log('DEBUG wpForgot reply', reply, { email, appId: app._id });
      if (reply.message) {
        throw new Error(reply.message);
      }
      throw new Error('invalid_credentials');
    }
  } finally {
    client.close();
  }
};
