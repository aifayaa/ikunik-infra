/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { AppType } from '@apps/lib/appEntity';
import { UserType } from '@users/lib/userEntity';
import { getFirestore } from 'firebase-admin/firestore';
import admin from 'firebase-admin';
import { getFirebaseApp, getServiceAccount } from './chatFirebaseUtils';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  CHAT_CHANNEL_CODE,
  CHAT_NOT_CONFIGURED_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_SETUP,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import { ChatChannelType, firebaseCollections } from './chatEntities';

const { COLL_APPS, COLL_USERS } = mongoCollections;

const { REGION, STAGE } = process.env;

const lambda = new Lambda({
  region: REGION,
});

function formatMessage(
  from: string,
  channelName: string,
  text: string,
  haveAttachments: boolean = false
) {
  const length = 116;

  const preparedText = `[${channelName}] ${from}: ${text}`
    /* Remove any html markup */
    .replace(/<[^>]+>/g, ' ')
    /* Replace new lines with whitespaces */
    .replace(/[\n\r]+/g, ' ')
    /* Remove successive whitespaces */
    .replace(/\s{2,}/g, ' ')
    /* Remove trailing whitespace at the beginning and at the end */
    .replace(/^\s+|\s+$/, '');

  /* Cut string at size but preserve word */
  const cutRegex = new RegExp(`^(.{${length}}[^\\s]*).*`, 'g');
  const cuttedText = preparedText.replace(cutRegex, '$1');

  if (!cuttedText && haveAttachments) {
    return '📁';
  }

  if (cuttedText.length < text.length) {
    return `${cuttedText}...`;
  }

  return cuttedText;
}

type ChatMessageSentParamsType = {
  channelId: string;
  message: string;
  haveAttachments: boolean;
};

export default async (
  userId: string,
  appId: string,
  { channelId, message, haveAttachments }: ChatMessageSentParamsType
) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const [app, user] = await Promise.all([
      db.collection(COLL_APPS).findOne({
        _id: appId,
      }) as Promise<AppType | null>,
      db.collection(COLL_USERS).findOne({
        _id: userId,
        appId,
      }) as Promise<UserType | null>,
    ]);

    if (!app) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        APP_NOT_FOUND_CODE,
        `The app '${appId}' was not found`
      );
    }
    if (!app.credentials || !app.credentials.firebase) {
      throw new CrowdaaError(
        ERROR_TYPE_SETUP,
        CHAT_NOT_CONFIGURED_CODE,
        `The app '${appId}' is not configured`
      );
    }
    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The user '${userId}' was not found`
      );
    }

    const { chatNotificationsEnabled = true } = app.settings.press || {};
    if (!chatNotificationsEnabled) {
      return;
    }

    const serviceAccount = getServiceAccount();

    const firebaseApp = getFirebaseApp(appId, {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: app.credentials.firebase.config.storageBucket,
      projectId: app.credentials.firebase.config.projectId,
    });

    const fsdb = getFirestore(firebaseApp);

    const channelDoc = await fsdb
      .collection(firebaseCollections.COLL_CHANNELS)
      .doc(channelId)
      .get();

    if (!channelDoc.exists) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_CHANNEL_CODE,
        `The chat channel '${channelId}' was not found`
      );
    }
    const channelData = channelDoc.data() as ChatChannelType;

    const channelMembersIds = channelData.isPublic ? null : channelData.members;

    await lambda
      .invoke({
        FunctionName: `blast-${STAGE}-queueNotifications`,
        Payload: JSON.stringify({
          appId,
          notifyAt: new Date().toISOString(),
          type: 'chatMessage',
          only: 'users',
          data: {
            message: formatMessage(
              user.profile.username,
              channelData.name,
              message,
              haveAttachments
            ),
            channelMembersIds,
            channelId,
          },
        }),
      })
      .promise();
  } finally {
    client.close();
  }
};
