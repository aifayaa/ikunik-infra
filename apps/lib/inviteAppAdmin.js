import MongoClient, { ObjectID } from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { sendEmailMailgunTemplate } from '../../libs/email/sendEmailMailgun';
import { register } from '../../auth/lib/register';
import Random from '../../libs/account_utils/random';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const {
  ADMIN_APP,
  REACT_APP_PRESS_SERVICE_URL,
  REACT_APP_AUTH_URL,
} = process.env;

const {
  COLL_APPS,
  COLL_PERM_GROUPS,
  COLL_USERS,
} = mongoCollections;

const BCC_EMAILS_BASE = [
  'vigile@crowdaa.com',
  'ob@crowdaa.com',
  'eric.eloy@crowdaa.com',
];

const BCC_EMAILS_EN = [
  'jimmy@crowdaa.com',
];

function sendNewAccountPassword(app, email, lang, {
  firstname,
  password,
}) {
  intlInit(lang);

  const subject = formatMessage('apps:invite_app_admin_email_title', { appName: app.name });

  let template;
  if (lang === 'en') {
    template = 'send_dashboard_access_en';
  } else {
    template = app.builds ? `send_dashboard_access_${lang}` : `welcome_preview_${lang}`;
  }

  let bcc = BCC_EMAILS_BASE.slice();
  if (lang === 'en') bcc = bcc.concat(BCC_EMAILS_EN);
  bcc = bcc.join(', ');

  return (sendEmailMailgunTemplate(
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
    },
  ));
}

async function addUserToAppPermGroups(
  client,
  userId,
  appPermGroupIds,
) {
  const db = client.db();

  const permGroupIds = {
    $each: appPermGroupIds.map((id) => ObjectID(id)),
  };

  await db.collection(COLL_USERS).updateOne(
    { _id: userId },
    {
      $addToSet: {
        permGroupIds,
      },
    },
  );
}

export default async (
  appId,
  email,
  firstname,
  lastname,
  lang,
  {
    groups = ['admins', 'moderators', 'crowd_managers'],
  } = {},
) => {
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

    const [permGroupsResults, usersResults] = await Promise.all([
      Promise.all(groups.map((group) => (
        db.collection(COLL_PERM_GROUPS).findOne({
          appId,
          name: { $regex: new RegExp(`.*_${group}$`) },
        })
      ))),
      db.collection(COLL_USERS).findOne({
        appId: ADMIN_APP,
        'emails.address': email,
      }),
    ]);
    const permGroupIds = permGroupsResults.filter((pg) => (pg)).map((result) => (result._id));
    if (permGroupIds.length === 0) {
      throw new Error('app_configuration_error');
    }
    if (usersResults) {
      userId = usersResults._id;
    } else {
      password = Random.secret(12);
      const newUser = await register(
        email,
        email,
        password,
        ADMIN_APP,
        { firstname, lastname },
      );
      userId = newUser.userId;
      inviteResult.userCreated = true;
    }

    await addUserToAppPermGroups(client, userId, permGroupIds);

    try {
      await sendNewAccountPassword(
        app,
        email,
        lang,
        { firstname, password },
      );
      inviteResult.invitationSent = true;
    } catch (e) {
      inviteResult.invitationSent = false;
      // eslint-disable-next-line no-console
      console.log('Invite email error', e);
    }
  } finally {
    client.close();
  }

  return (inviteResult);
};
