import MongoClient from '../../libs/mongoClient';
import { ChatEngineAPI } from '../../libs/backends/chatengine';
import mongoCollections from '../../libs/mongoCollections.json';
import Random from '../../libs/account_utils/random';

const {
  COLL_APPS,
  COLL_USERS,
} = mongoCollections;

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user] = await Promise.all([
      db.collection(COLL_APPS)
        .findOne({
          _id: appId,
        }, { projection: {
          'credentials.chatengine': 1,
        } }),
      db.collection(COLL_USERS)
        .findOne({
          _id: userId,
          appId,
        }, { projection: {
          'services.chatengine': 1,
          profile: 1,
        } }),
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('user_not_found');

    if (!app.credentials || !app.credentials.chatengine) {
      return (null);
    }

    if (
      !user.services ||
      !user.services.chatengine
    ) {
      const api = new ChatEngineAPI(app);

      const {
        firstname,
        lastname,
        username,
      } = user.profile;
      const password = Random.secret(31);
      await api.call('POST', '/users/', {
        username,
        first_name: firstname || '',
        last_name: lastname || '',
        secret: password,
      });

      user.services = {
        chatengine: {
          username,
          password,
        },
      };

      await db.collection(COLL_USERS).updateOne({
        _id: userId,
        appId,
      }, { $set: {
        'services.chatengine': user.services.chatengine,
      } });
    }

    return ({
      chatPublicKey: app.credentials.chatengine.publicKey,
      password: user.services.chatengine.password,
      username: user.services.chatengine.username,
    });
  } finally {
    client.close();
  }
};
