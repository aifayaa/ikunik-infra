import MailComposer from 'nodemailer/lib/mail-composer';
import Mailgun from 'mailgun-js';
import crypto from 'crypto';
import { MongoClient } from 'mongodb';
import { forgotPasswordEmailHTML } from './forgotPasswordEmailHTML';

const TOKEN_TIMEOUT = 3600000; // 1 hour in ms

const {
  MAILGUN_API_KEY,
  MAILGUN_DOMAIN,
  MAILGUN_FROM,
  DB_NAME,
  COLL_USERS,
  COLL_APPS,
} = process.env;

const mailgun = Mailgun({
  apiKey: MAILGUN_API_KEY,
  domain: MAILGUN_DOMAIN,
});

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
          projection: { _id: true, emails: true, 'profile.username': true },
        },
      ),
      appsCollection.findOne({ _id: appId }, { projection: { _id: true, builds: true } }),
    ]);

    if (!user) throw new Error('email_not_found');
    if (!app) throw new Error('app_not_found');

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

    const mail = new MailComposer({
      subject,
      html: forgotPasswordEmailHTML(user.profile.username, url, token, email),
      from: `${MAILGUN_FROM}@${MAILGUN_DOMAIN}`,
      to: email,
    });

    const mailBuild = new Promise((resolve, reject) => {
      mail.compile().build((error, message) => {
        if (error) return reject(error);
        return resolve(message);
      });
    });
    const message = await mailBuild;
    const dataToSend = {
      message: message.toString('ascii'),
      to: email,
    };
    await mailgun.messages().sendMime(dataToSend);
  } finally {
    client.close();
  }
};
