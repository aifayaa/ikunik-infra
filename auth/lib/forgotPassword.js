import crypto from 'crypto';
import get from 'lodash/get';
import { MongoClient } from 'mongodb';
import { forgotPasswordEmailHTML } from './forgotPasswordEmailHTML';
import { sendEmail } from './sendEmail';

const TOKEN_TIMEOUT = 3600000; // 1 hour in ms
const RETRY_TIMEOUT = 2 * 60000; // 2 min in ms

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

export const forgotPassword = async (email, urlScheme, appId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
  });
  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const [user, app] = await Promise.all([
      usersCollection.findOne(
        { emails: { $elemMatch: { address: email } } },
        {
          projection: { _id: true, emails: true, 'profile.username': true, 'services.password.reset': true },
        },
      ),
      appsCollection.findOne({ _id: appId }, { projection: { _id: true, builds: true } }),
    ]);

    if (!user) throw new Error('email_not_found');
    if (!app) throw new Error('app_not_found');
    if ((new Date() - get(user, 'services.password.reset.when', 0)) < RETRY_TIMEOUT) {
      throw new Error('token_already_sent');
    }

    /* Generate reset token */
    const token = crypto
      .randomBytes(3)
      .toString('hex')
      .toUpperCase();

    const when = new Date();
    const expiresAt = new Date(when.getTime() + TOKEN_TIMEOUT);
    const $set = {
      'services.password.reset': {
        token,
        email,
        when,
        expiresAt,
        reason: 'reset',
        appId,
      },
    };

    /* store token into db */
    await usersCollection.updateOne({ _id: user._id }, { $set });

    /* send token by email to user */
    const subject = 'Forgot Password'; // TODO: intl
    const protocol = urlScheme || app.builds[0].name.toLowerCase().replace(/ /g, '');
    const url = `${protocol}://resetPassword`;
    const html = forgotPasswordEmailHTML(user.profile.username, url, token, email);

    await sendEmail(subject, html, email);
  } finally {
    client.close();
  }
};
