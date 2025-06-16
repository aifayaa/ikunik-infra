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
import admin from 'firebase-admin';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import { getFirebaseApp } from './chatFirebaseUtils';
import { ChatChannelType, firebaseCollections } from './chatEntities';

const { COLL_APPS, COLL_USERS } = mongoCollections;

export default async (appId: string, userId: string, channelId: string) => {
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

    const firebaseApp = getFirebaseApp(app);

    const fsdb = getFirestore(firebaseApp);

    const channelRef = await fsdb
      .collection(firebaseCollections.COLL_CHANNELS)
      .doc(channelId)
      .get();

    const channelData = channelRef.data() as ChatChannelType | null;
    if (!channelRef.exists || !channelData) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        CHAT_CHANNEL_CODE,
        `The chat channel '${channelId}' was not found`
      );
    }

    await fsdb
      .collection(firebaseCollections.COLL_CHANNELS)
      .doc(channelId)
      .set({ members: FieldValue.arrayRemove(userId) }, { merge: true });
  } finally {
    client.close();
  }
};
