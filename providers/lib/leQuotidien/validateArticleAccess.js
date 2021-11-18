import MongoClient from '../../../libs/mongoClient';
import { WordpressAPI } from '../../../libs/backends/wordpress';

const {
  COLL_APPS,
  COLL_USERS,
  LEQUOTIDIEN_ACCESS_CHECK_URI,
} = process.env;

export default async (
  appId,
  userId,
  articleId,
) => {
  const client = await MongoClient.connect();
  try {
    const app = await client.db().collection(COLL_APPS).findOne({ _id: appId });
    const user = await client.db()
      .collection(COLL_USERS)
      .findOne({ _id: userId, appId }, {
        projection: {
          'emails.address': 1,
          'profile.email': 1,
        },
      });

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('user_not_found');

    const email =
      (user.profile && user.profile.email) ||
      (user.emails[0] && user.emails[0].address);

    if (!email) throw new Error('email_not_found');

    const api = new WordpressAPI(app);

    const response = await api.call('POST', LEQUOTIDIEN_ACCESS_CHECK_URI, {
      email,
      articleId,
    });

    if (!response || !response.access_granted) {
      throw new Error('forbidden');
    }
  } finally {
    client.close();
  }
};
