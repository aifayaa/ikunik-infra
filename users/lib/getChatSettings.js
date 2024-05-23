/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient.ts';
import { ChatEngineAPI } from '../../libs/backends/chatengine';
import mongoCollections from '../../libs/mongoCollections.json';
import Random from '../../libs/account_utils/random';

const { COLL_APPS, COLL_USERS } = mongoCollections;

/**
 * A function that runs all async (or promise-returning) functions provided one by one,
 * until it either reaches the end or throws an error.
 * It returns an array of all results.
 * @param {array} promises An array of callbacks returning a promise.
 */
function promiseChain(promises) {
  return new Promise((resolve, reject) => {
    let index = 0;
    const returns = [];

    const processNext = (data) => {
      if (index > 0) {
        returns[index - 1] = data;
      }

      if (index >= promises.length) {
        resolve(returns);
        return;
      }

      const cb = promises[index];
      index += 1;
      cb().then(processNext).catch(reject);
    };

    processNext();
  });
}

export default async (userId, appId) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user] = await Promise.all([
      db.collection(COLL_APPS).findOne(
        {
          _id: appId,
        },
        {
          projection: {
            'credentials.chatengine': 1,
            'settings.chatengine': 1,
          },
        }
      ),
      db.collection(COLL_USERS).findOne(
        {
          _id: userId,
          appId,
        },
        {
          projection: {
            'services.chatengine': 1,
            profile: 1,
          },
        }
      ),
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('user_not_found');

    if (!app.credentials || !app.credentials.chatengine) {
      return null;
    }

    if (!user.services || !user.services.chatengine) {
      const api = new ChatEngineAPI(app);

      const { firstname, lastname } = user.profile;
      const username = user.profile.username.trim();
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

      await db.collection(COLL_USERS).updateOne(
        {
          _id: userId,
          appId,
        },
        {
          $set: {
            'services.chatengine': user.services.chatengine,
          },
        }
      );

      if (
        app.settings &&
        app.settings.chatengine &&
        app.settings.chatengine.defaultRooms
      ) {
        const { defaultRooms: rooms } = app.settings.chatengine;
        const cbs = rooms.map(({ roomId, ownerId }) => async () => {
          const owner = await db.collection(COLL_USERS).findOne(
            {
              _id: ownerId,
              appId,
            },
            {
              projection: {
                'services.chatengine': 1,
              },
            }
          );

          if (
            owner &&
            owner.services &&
            owner.services.chatengine &&
            owner.services.chatengine.username &&
            owner.services.chatengine.password
          ) {
            try {
              await api.call(
                'POST',
                `/chats/${roomId}/people/`,
                {
                  username,
                },
                {
                  headers: {
                    'PRIVATE-KEY': undefined,
                    'public-key': app.credentials.chatengine.publicKey,
                    'user-name': owner.services.chatengine.username,
                    'user-secret': owner.services.chatengine.password,
                  },
                }
              );
            } catch (e) {
              // eslint-disable-next-line no-console
              console.error('Error adding user', e);
            }
          }
        });

        await promiseChain(cbs);
      }
    }

    return {
      chatPublicKey: app.credentials.chatengine.publicKey,
      password: user.services.chatengine.password,
      username: user.services.chatengine.username,
    };
  } finally {
    client.close();
  }
};
