import MongoClient from '../../libs/mongoClient';

const { DB_NAME, COLL_USERS, COLL_APPS } = process.env;

export const validateEmail = async (email, token, appId) => {
  const client = await MongoClient.connect();

  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const app = await appsCollection.findOne({ _id: appId }, { projection: { _id: true } });
    if (!app) throw new Error('app_not_found');

    const user = await usersCollection.findOne({
      appId,
      'emails.address': email,
    }, {
      projection: {
        'emails.$': 1,
      },
    });

    if (!user) {
      throw new Error('email_not_found');
    } else if (user.emails[0].token !== token) {
      throw new Error('invalid_email_token');
    }

    await usersCollection.updateOne({
      _id: user._id,
      'emails.address': email,
    }, {
      $set: {
        'emails.$.verified': true,
      },
      $unset: {
        'emails.$.token': '',
      },
    });
  } finally {
    client.close();
  }
};
