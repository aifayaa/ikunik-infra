/* eslint-disable import/no-relative-packages */
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { register } from '../../auth/lib/register';
import Random from '../../libs/account_utils/random';
import { formatMessage, intlInit } from '../../libs/intl/intl';
import { indexObjectArrayWithKey, objGet } from '../../libs/utils';

const { ADMIN_APP, REACT_APP_PRESS_SERVICE_URL, REACT_APP_AUTH_URL } =
  process.env;

const { COLL_APPS, COLL_USERS } = mongoCollections;

const BCC_EMAILS_BASE = [
  'vigile@crowdaa.com',
  'ob@crowdaa.com',
  'eric.eloy@crowdaa.com',
];

const BCC_EMAILS_EN = ['jimmy@crowdaa.com'];

function sendNewAccountPassword(app, email, lang, { firstname, password }) {
  intlInit(lang);

  const subject = formatMessage('apps:invite_app_admin_email_title', {
    appName: app.name,
  });

  let template;
  if (lang === 'en') {
    template = 'send_dashboard_access_en';
  } else {
    template = app.builds
      ? `send_dashboard_access_${lang}`
      : `welcome_preview_${lang}`;
  }

  let bcc = BCC_EMAILS_BASE.slice();
  if (lang === 'en') bcc = bcc.concat(BCC_EMAILS_EN);
  bcc = bcc.join(', ');

  return sendEmailMailgunTemplate(
    'No reply <support@crowdaa.com>',
    email,
    subject,
    template,
    {
      appId: app._id,
      appName: app.name,
      email,
      firstname,
      pwd: password,
      url: `${REACT_APP_PRESS_SERVICE_URL}/${app._id}`,
      authUrl: `${REACT_APP_AUTH_URL}/password-forgot?skipPhoneRegister=true&redirect_uri=${REACT_APP_PRESS_SERVICE_URL}/${app._id}/home`,
    },
    {
      bcc,
    }
  );
}

async function setUserAsAdmin(client, user, app) {
  const db = client.db();

  const appsPerms = indexObjectArrayWithKey(
    objGet(user, 'perms.apps', []),
    '_id'
  );

  if (!appsPerms[app._id]) {
    await db.collection(COLL_USERS).updateOne(
      {
        _id: user._id,
        appId: ADMIN_APP,
      },
      {
        $push: {
          'perms.apps': {
            _id: app._id,
            roles: ['admin'],
          },
        },
      }
    );
  } else if (
    !appsPerms[app._id].roles ||
    (appsPerms[app._id].roles.indexOf('admin') < 0 &&
      appsPerms[app._id].roles.indexOf('owner') < 0)
  ) {
    await db.collection(COLL_USERS).updateOne(
      {
        _id: user._id,
        appId: ADMIN_APP,
        'perms.apps._id': app._id,
      },
      {
        $set: {
          'perms.apps.$.roles': ['admin'],
        },
      }
    );
  }
}

export default async (appId, email, firstname, lastname, lang) => {
  const client = await MongoClient.connect();
  const inviteResult = {
    email,
    userCreated: false,
    invitationSent: false,
  };

  try {
    const db = client.db();
    let userId;
    let password = '';

    const app = await db.collection(COLL_APPS).findOne({ _id: appId });

    if (!app) {
      throw new Error('app_not_found');
    }

    let user = await db.collection(COLL_USERS).findOne({
      appId: ADMIN_APP,
      'emails.address': email,
    });

    if (user) {
      userId = user._id;
    } else {
      password = Random.secret(12);
      const newUser = await register(email, email, password, ADMIN_APP, {
        firstname,
        lastname,
      });
      userId = newUser.userId;
      inviteResult.userCreated = true;
      user = await db.collection(COLL_USERS).findOne({
        _id: userId,
        appId: ADMIN_APP,
      });
    }

    await setUserAsAdmin(client, user, app);

    try {
      await sendNewAccountPassword(app, email, lang, { firstname, password });
      inviteResult.invitationSent = true;
    } catch (e) {
      inviteResult.invitationSent = false;
      // eslint-disable-next-line no-console
      console.log('Invite email error', e);
    }
  } finally {
    client.close();
  }

  return inviteResult;
};
