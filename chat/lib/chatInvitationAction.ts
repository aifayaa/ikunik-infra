/* eslint-disable import/no-relative-packages */
import { AppType } from '@apps/lib/appEntity';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  APP_NOT_FOUND_CODE,
  CHAT_CHANNEL_CODE,
  CHAT_INVITATION_CODE,
  CHAT_NOT_CONFIGURED_CODE,
  CHAT_USER_ALREADY_MEMBER_CODE,
  CHAT_USER_BANNED_CODE,
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  ERROR_TYPE_SETUP,
  ERROR_TYPE_VALIDATION_ERROR,
  INVALID_CHAT_INVITATION_STATUS_CODE,
  USER_NOT_FOUND_CODE,
} from '@libs/httpResponses/errorCodes';
import admin, { AppOptions } from 'firebase-admin';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

import { getFirebaseApp, getServiceAccount } from './chatFirebaseUtils';
import {
  ChatChannelType,
  ChatInvitationStatusType,
  ChatInvitationType,
  ChatUserType,
  firebaseCollections,
} from './chatEntities';

const { COLL_APPS, COLL_USERS } = mongoCollections;

type ChatInvitationActionParams = {
  action: 'accept' | 'reject';
  invitationId: string;
};

export default async (
  appId: string,
  userId: string,
  { action, invitationId }: ChatInvitationActionParams
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

    const user = await db.collection(COLL_USERS).findOne({
      _id: userId,
      appId,
    });

    if (!user) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        USER_NOT_FOUND_CODE,
        `The user '${userId}' was not found`
      );
    }

    const serviceAccount = getServiceAccount();

    const firebaseApp = getFirebaseApp(appId, {
      credential: admin.credential.cert(serviceAccount),
      storageBucket: app.credentials.firebase.config.storageBucket,
      projectId: app.credentials.firebase.config.projectId,
    });

    const fsdb = getFirestore(firebaseApp);

    const invitationDoc = await fsdb
      .collection(firebaseCollections.COLL_INVITATIONS)
      .doc(invitationId)
      .get();

    if (!invitationDoc.exists) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_INVITATION_CODE,
        `The invitation '${invitationId}' was not found`
      );
    }
    const invitationData = invitationDoc.data() as ChatInvitationType;

    if (invitationData.toUser.id !== userId) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_INVITATION_CODE,
        `The invitation '${invitationId}' was not found`
      );
    }

    if (invitationData.status !== 'pending') {
      throw new CrowdaaError(
        ERROR_TYPE_VALIDATION_ERROR,
        INVALID_CHAT_INVITATION_STATUS_CODE,
        `The invitation '${invitationId}' was already processed`
      );
    }

    const channelDoc = await fsdb
      .collection(firebaseCollections.COLL_CHANNELS)
      .doc(invitationData.channel.id)
      .get();

    if (!channelDoc.exists) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_CHANNEL_CODE,
        `The chat channel '${invitationData.channel.id}' was not found`
      );
    }

    const channelData = channelDoc.data() as ChatChannelType;

    if (!channelData.isPublic && action === 'accept') {
      await fsdb
        .collection(firebaseCollections.COLL_CHANNELS)
        .doc(invitationData.channel.id)
        .set({ members: FieldValue.arrayUnion(userId) }, { merge: true });
    }

    const status: ChatInvitationStatusType =
      action === 'accept' ? 'accepted' : 'rejected';
    await fsdb
      .collection(firebaseCollections.COLL_INVITATIONS)
      .doc(invitationId)
      .set(
        { status },
        // Just update the invitation data, not it's status
        { merge: true }
      );
  } finally {
    client.close();
  }
};
