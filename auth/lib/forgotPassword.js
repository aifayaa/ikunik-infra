import crypto from 'crypto';
import get from 'lodash/get';
import MongoClient from '../../libs/mongoClient';
import { forgotPasswordEmailHTML } from './forgotPasswordEmailHTML';
import { sendEmail } from '../../libs/email/sendEmail';

const TOKEN_TIMEOUT = 3600000; // 1 hour in ms
const RETRY_TIMEOUT = 2 * 60000; // 2 min in ms

const {
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

export const forgotPassword = async (email, urlScheme, appId) => {
  const client = await MongoClient.connect();
  try {
    const usersCollection = client.db(DB_NAME).collection(COLL_USERS);
    const appsCollection = client.db(DB_NAME).collection(COLL_APPS);
    const [user, app] = await Promise.all([
      usersCollection.findOne(
        {
          'emails.address': email,
          appIds: { $elemMatch: { $eq: appId } },
        },
        {
          projection: { _id: true, emails: true, 'profile.username': true, 'services.password.reset': true },
        },
      ),
      appsCollection.findOne(
        { _id: appId },
        { projection: { _id: true, builds: true, name: true } },
      ),
    ]);

    if (!app) throw new Error('app_not_found');
    if (!user) throw new Error('email_not_found');
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

    /* Prepare data for email */
    const subject = 'Forgot Password'; // TODO: intl
    const build = app.builds && (app.builds.ios || app.builds.android || app.builds[0]);
    const protocol = urlScheme || (build ? app.builds[0] : app).name.toLowerCase().replace(/ /g, '');
    const url = `${protocol}://resetPassword`;

    /* store token into db */
    await usersCollection.updateOne({ _id: user._id }, { $set });

    /* send token by email to user */
    const html = forgotPasswordEmailHTML(user.profile.username, url, token, email);

    await sendEmail(subject, html, email);
  } finally {
    client.close();
  }
};
