/* eslint-disable import/no-relative-packages */
import uuid from 'uuid';
import MongoClient from '../../libs/mongoClient';
import Random from '../../libs/account_utils/random';
import mongoCollections from '../../libs/mongoCollections.json';

const { ADMIN_APP } = process.env;

const { COLL_APPS, COLL_USERS, COLL_PERM_GROUPS } = mongoCollections;

const DEFAULT_PERMS_ADMIN = {
  apps_getInfos: true,
  apps_getProfile: true,
  crowd_blast: true,
  files_upload: true,
  pressArticles_all: true,
  pressCategories_all: true,
  search_press: true,
  userGeneratedContents_all: true,
};

const DEFAULT_PERMS_MODERATORS = {
  apps_getInfos: true,
  userGeneratedContents_all: true,
  userGeneratedContents_notify: true,
};

const DEFAULT_PERMS_CROWD_MANAGERS = {
  apps_getInfos: true,
  crowd_blast: true,
  search_press: true,
};

const DEFAULT_APP_SETTINGS = {
  press: {
    chatNotificationsEnabled: true,
    moderationRequired: false,
    env: {
      apiKeyCanBeChanged: false,
      articleFromCommunityDateFormat: 'lll',
      articleFromFeedDateFormat: 'lll',
      biometrics: true,
      categoryArticleDateFormat: 'L',
      communityArticleCommentsEnabled: true,
      communityArticleDateFormat: 'L',
      communityArticleShareEnabled: true,
      displayArticleAuthor: true,
      displayArticleCommentsCount: true,
      displayArticleLikesViews: true,
      displayPopularCategories: true,
      feedArticleCommentsEnabled: true,
      feedArticleDateFormat: 'L',
      feedArticleShareEnabled: true,
      forgotPasswordEnabled: true,
      geolocation: true,
      isBeta: false,
      keycloakClient: '',
      keycloakRealm: '',
      keycloakUrl: '',
      loginArticleRequired: false,
      loginWithUsername: false,
      nftLoginEnabled: false,
      phoneRegisterEnabled: false,
      phoneRegisterRequired: false,
      registerWithCrowdaa: true,
      reversedFeed: false,
      signInWithApple: true,
      signInWithCrowdaa: true,
      signInWithFacebook: true,
      signInWithSAML: false,
      startTab: 'today',
      tabOrder: 'today,categories,community,search,settings',
    },
  },
};

async function checkIfUserIsFromRootApp(db, userId) {
  const user = await db.collection(COLL_USERS).findOne({ _id: userId });

  if (!user) {
    throw new Error('user_not_found');
  }

  if (user.appId !== ADMIN_APP) {
    throw new Error('invalid_apikey');
  }
}

async function createApp(db, name, userId, inputProtocol) {
  const apiKey = Random.id(42); // AWS makes it 40, let's make it 42 to have a tiny difference. And because 42!
  const key = apiKey.value;
  const appId = uuid.v4();

  const appFirstChars = name
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, '')
    .substr(0, 100);
  const protocol =
    (inputProtocol && inputProtocol.substr(0, 120)) ||
    `crowdaa${appFirstChars}${Random.id(8)}proto`;

  const toInsert = {
    _id: appId,
    key,
    name,
    owners: [userId],
    protocol,
    settings: DEFAULT_APP_SETTINGS,
  };
  await db.collection(COLL_APPS).insertOne(toInsert);

  return toInsert._id;
}

async function createPermGroups(db, appId, name) {
  const promises = [];

  promises.push(
    db.collection(COLL_PERM_GROUPS).insertOne({
      appId,
      name: `${name}_admins`,
      perms: DEFAULT_PERMS_ADMIN,
    })
  );

  promises.push(
    db.collection(COLL_PERM_GROUPS).insertOne({
      appId,
      name: `${name}_moderators`,
      perms: DEFAULT_PERMS_MODERATORS,
    })
  );

  promises.push(
    db.collection(COLL_PERM_GROUPS).insertOne({
      appId,
      name: `${name}_crowd_managers`,
      perms: DEFAULT_PERMS_CROWD_MANAGERS,
    })
  );

  const [
    { insertedId: admins },
    { insertedId: moderators },
    { insertedId: crowdManagers },
  ] = await Promise.all(promises);

  return {
    admins,
    moderators,
    crowdManagers,
  };
}

async function addUserToPermGroups(db, userId, permGroupIds) {
  await db.collection(COLL_USERS).updateOne(
    { _id: userId },
    {
      $addToSet: {
        permGroupIds: { $each: Object.values(permGroupIds) },
      },
    }
  );
}

export default async (name, userId, { protocol = null } = {}) => {
  const client = await MongoClient.connect();
  try {
    const db = client.db();

    await checkIfUserIsFromRootApp(db, userId);

    const appId = await createApp(db, name, userId, protocol);

    const permGroupIds = await createPermGroups(db, appId, name);

    await addUserToPermGroups(db, userId, permGroupIds);

    return { appId };
  } finally {
    client.close();
  }
};
