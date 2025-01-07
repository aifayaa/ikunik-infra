/* eslint-disable import/no-relative-packages */
import MongoClient from '../../../libs/mongoClient';
import { WordpressAPI } from '../../../libs/backends/wordpress';
import { wordpressLogin } from './wordpressLogin';

export const wordpressRegister = async (username, email, password, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);

  try {
    let reply;

    try {
      reply = await wpApi.call('POST', '/crowdaa-sync/v1/users/register', {
        username,
        email,
        password,
      });
    } catch (e) {
      console.log('DEBUG wpRegister e', e, { username, email, appId: app._id });
      if (!e.response) {
        throw new Error('backend_network_error');
      } else if (!e.error) {
        throw new Error('backend_error');
      } else if (e.error.code === 'email_exists') {
        throw new Error('email_already_exists');
      } else if (e.error.code === 'username_exists') {
        throw new Error('username_already_exists');
      } else {
        throw new Error('backend_error');
      }
    }

    if (!reply) {
      console.log('DEBUG wpRegister noreply', {
        username,
        email,
        appId: app._id,
      });
      throw new Error('backend_error');
    }
    if (reply.code !== 200) {
      console.log('DEBUG wpRegister reply', reply, {
        username,
        email,
        appId: app._id,
      });
      if (reply.message) {
        throw new Error(reply.message);
      }
      throw new Error('invalid_credentials');
    }

    return await wordpressLogin(username, password, app, true);
  } finally {
    client.close();
  }
};
