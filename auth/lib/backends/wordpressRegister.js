import MongoClient from '../../../libs/mongoClient';
import { WordpressAPI } from '../../../libs/backends/wordpress';
import { wordpressLogin } from './wordpressLogin';

export const wordpressRegister = async (username, email, password, app) => {
  const client = await MongoClient.connect();
  const wpApi = new WordpressAPI(app);

  try {
    let reply;

    try {
      reply = await wpApi.call('POST', '/wp/v2/users/register', {
        username,
        email,
        password,
      });
    } catch (e) {
      if (!e.response) {
        throw new Error('backend_network_error');
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

    return (await wordpressLogin(username, password, app));
  } finally {
    client.close();
  }
};
