/* eslint-disable import/no-relative-packages */
import { AppType } from '@apps/lib/appEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  CHAT_CHANNEL_CODE,
  CHAT_NOT_CONFIGURED_CODE,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_SETUP,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import admin, { AppOptions } from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { getFirebaseApp, getServiceAccount } from './chatFirebaseUtils';

const { COLL_APPS, COLL_USERS } = mongoCollections;

type ChatUsersInviteParams = {
  fromUserId: string;
  toUserId: string;
  channelId: string;
};

export default async (
  appId: string,
  { fromUserId, toUserId, channelId }: ChatUsersInviteParams
) => {
  const client = await MongoClient.connect();
  const db = client.db();

  try {
    const app: AppType | null = await db.collection(COLL_APPS).findOne({
      _id: appId,
    });

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

    const fromUser = await db.collection(COLL_USERS).findOne({
      _id: fromUserId,
      appId,
    });
    const toUser = await db.collection(COLL_USERS).findOne({
      _id: fromUserId,
      appId,
    });

    // fromUser should always be defined since fetched & checked at the authorizer step
    if (!fromUser || !toUser) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The user '${(!fromUser && fromUserId) || toUserId}' was not found`
      );
    }

    const serviceAccount = getServiceAccount();

    const firebaseApp = getFirebaseApp(appId, {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: app.credentials.firebase.config.storageBucket,
      projectId: app.credentials.firebase.config.projectId,
    });

    const fsdb = getFirestore(firebaseApp);

    // Always ensure the user we are handling is created & up to date
    await fsdb.collection('users').doc(toUserId).set({
      updatedAt: new Date(),
      profile: toUser.profile,
    });

    const channelRef = await fsdb.collection('channels').doc(channelId).get();

    const channelData = channelRef.data();
    if (!channelRef.exists || !channelData) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_CHANNEL_CODE,
        `The chat channel '${channelId}' was not found`
      );
    }

    const invitationRef = fsdb
      .collection('invitations')
      .doc(`${channelId}-${fromUserId}-${toUserId}`);
    const invitation = await invitationRef.get();

    if (invitation.exists) {
      await invitationRef.set(
        {
          fromUser: {
            id: fromUser._id,
            profile: fromUser.profile,
          },
          toUser: {
            id: toUser._id,
            profile: toUser.profile,
          },
          channel: {
            id: channelId,
            name: channelData.name,
          },
        },
        // Just update the invitation data, not it's status
        { merge: true }
      );

      return { invited: false };
    }

    await invitationRef.set({
      fromUser: {
        id: fromUser._id,
        profile: fromUser.profile,
      },
      toUser: {
        id: toUser._id,
        profile: toUser.profile,
      },
      channel: {
        id: channelId,
        name: channelData.name,
      },
      createdAt: new Date(),
      status: 'pending',
    });

    return { invited: true };
  } finally {
    client.close();
  }
};
